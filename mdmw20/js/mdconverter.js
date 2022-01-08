(function(){
  // Based on showdown v1.9.1 - 02-11-2019 (Tivie 13-07-2015, Estevao 31-05-2015, et al).
  // stfwi: Minified and modified for compat with duktape CLI usage.
  const sd = {};
  const extensions_ = {};

  const aux = (function() {
    'use strict';
    const aux = {};

    aux.isString = function(a) {
      return (typeof(a)==='string' || (a instanceof String));
    };

    aux.isFunction = function(a) {
      'use strict';
      return a && ({}.toString.call(a) === '[object Function]');
    };

    aux.escapeCharactersCallback = function(wm, m1) {
      'use strict';
      return '¨E' + m1.charCodeAt(0) + 'E';
    };

    aux.escapeCharacters = function(text, charsToEscape, afterBackslash) {
      'use strict';
      var sre = '([' + charsToEscape.replace(/([\[\]\\])/g, '\\$1') + '])';
      if(afterBackslash) sre = '\\\\' + sre;
      text = text.replace(new RegExp(sre, 'g'), aux.escapeCharactersCallback);
      return text;
    };

    aux.unescapeHTMLEntities = function(txt) {
      'use strict';
      return txt.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    };

    const machpos = function(str, left, right, flags) {
      'use strict';
      var f = flags || '',
          g = f.indexOf('g') > -1,
          x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, '')),
          l = new RegExp(left, f.replace(/g/g, '')),
          pos = [],
          t, s, m, start, end;
      do {
        t = 0;
        while((m = x.exec(str))) {
          if(l.test(m[0])) {
            if(!(t++)) {
              s = x.lastIndex;
              start = s - m[0].length;
            }
          } else if(t) {
            if(!--t) {
              end = m.index + m[0].length;
              var obj = {
                left: {start: start, end: s},
                match: {start: s, end: m.index},
                right: {start: m.index, end: end},
                wholeMatch: {start: start, end: end}
              };
              pos.push(obj);
              if(!g) return pos;
            }
          }
        }
      } while(t && (x.lastIndex = s));

      return pos;
    };

    aux.match_r = function(str, left, right, flags) {
      // matchRecursiveRegExp, (c) 2007 Steven Levithan <stevenlevithan.com>, lic: MIT.
      'use strict';
      var results=[], matchPos = machpos(str, left, right, flags);
      for(var i=0; i<matchPos.length; ++i) {
        results.push([
          str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
          str.slice(matchPos[i].match.start, matchPos[i].match.end),
          str.slice(matchPos[i].left.start, matchPos[i].left.end),
          str.slice(matchPos[i].right.start, matchPos[i].right.end)
        ]);
      }
      return results;
    };

    aux.replace_r = function(str, replacement, left, right, flags) {
      'use strict';
      if(!aux.isFunction(replacement)) {
        var repStr = replacement;
        replacement = function() { return repStr; };
      }
      var matchPos = machpos(str, left, right, flags);
      var finalStr = str;
      var lng = matchPos.length;
      if(lng > 0) {
        var bits = [];
        if(matchPos[0].wholeMatch.start !== 0) {
          bits.push(str.slice(0, matchPos[0].wholeMatch.start));
        }
        for(var i=0; i<lng; ++i) {
          bits.push(replacement(
            str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
            str.slice(matchPos[i].match.start, matchPos[i].match.end),
            str.slice(matchPos[i].left.start, matchPos[i].left.end),
            str.slice(matchPos[i].right.start, matchPos[i].right.end)
          ));
          if(i < lng - 1) {
            bits.push(str.slice(matchPos[i].wholeMatch.end, matchPos[i + 1].wholeMatch.start));
          }
        }
        if(matchPos[lng - 1].wholeMatch.end < str.length) {
          bits.push(str.slice(matchPos[lng - 1].wholeMatch.end));
        }
        finalStr = bits.join('');
      }
      return finalStr;
    };

    aux.regexIndexOf = function(str, regex, fromIndex) {
      'use strict';
      if(!(regex instanceof RegExp)) throw 'InvalidArgumentError: second parameter of aux.regexIndexOf function must be an instance of RegExp';
      fromIndex = fromIndex || 0;
      const p = str.substring(fromIndex).search(regex);
      return (p >= 0) ? (p + fromIndex) : p;
    };

    aux.splitAtIndex = function(str, index) {
      'use strict';
      return [str.substring(0, index), str.substring(index)];
    };

    aux.obfuscateEmail = function(mail) {
      'use strict';
      const encode = [
        function(ch) { return '&#' + ch.charCodeAt(0) + ';'; },
        function(ch) { return '&#x' + ch.charCodeAt(0).toString(16) + ';'; },
        function(ch) { return ch; }
      ];
      mail = mail.replace(/./g, function(ch) {
        if(ch === '@') {
          ch = encode[Math.floor(Math.random() * 2)](ch);
        } else {
          var r = Math.random();
          ch = (r > 0.9 ? encode[2](ch) : r > 0.45 ? encode[1](ch) : encode[0](ch));
        }
        return ch;
      });
      return mail;
    };

    aux.padEnd = function padEnd (str, targetLength, padString) {
      'use strict';
      targetLength = targetLength>>0;
      padString = String(padString || ' ');
      if(str.length > targetLength) {
        return String(str);
      } else {
        targetLength = targetLength - str.length;
        if(targetLength > padString.length) {
          padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
        }
        return String(str) + padString.slice(0,targetLength);
      }
    };

    aux.warn = function(msg) {
      if((console !== undefined) && console.warn) {
        console.warn(msg);
      } else if((console !== undefined) && console.log) {
        console.log("Warning: " + msg);
      } else {
        alert("Warning: " + msg);
      }
    };

    aux.emojis = {};
    return aux;
  })();

  sd.flavors = function() {
    return {
      original: {
        no_codeblock_newline: false, // Omit the default extra whiteline added to code blocks
        no_header_id: true, // Turn on/off generated header id
        header_id_prefix: false, // Add a prefix to the generated header ids. Passing a string will prefix that string to the header id. Setting to true will add a generic \'section-\' prefix
        header_id_raw_prefix: false, // Setting this option to true will prevent sd from modifying the prefix. This might result in malformed IDs (if, for instance, the " char is used in the prefix)
        header_id_github: false, // Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)
        header_id_raw: false, // Remove only spaces, \' and " from generated header ids (including prefixes), replacing them with dashes (-). WARNING: This might result in malformed ids
        header_start_level: false, // The header blocks level start
        fetch_image_dimensions: false, // Turn on/off image dimension parsing
        autolink_simple: false, // Turn on/off GFM autolink style
        autolink_no_trailing_url_punctuation: false, // Excludes trailing punctuation from links generated with autoLinking
        midword_underscores_are_literals: false, // Parse midword underscores as literal underscores
        midword_asterisks_are_literals: false, // Parse midword asterisks as literal asterisks
        with_strikethrough: false, // Turn on/off strikethrough support
        with_tables: false, // Turn on/off tables support
        with_table_header_ids: false, // Add an id to table headers
        with_github_codeblocks: false, // Turn on/off GFM fenced code blocks support
        with_tasklists: false, // Turn on/off GFM tasklist support
        with_livepreview_fix: false, // Prevents weird effects in live previews due to incomplete input
        with_smart_indentation_fix: false, // Tries to smartly fix indentation in es6 strings
        no_4space_indented_sublists: false, // Disables the requirement of indenting nested sublists by 4 spaces
        with_simple_line_breaks: false, // Parses simple line breaks as <br> (GFM Style)
        with_space_before_heading_text_requirement: false, // Makes adding a space between `#` and the header text mandatory (GFM Style)
        with_github_mentions: false, // Enables github @mentions
        github_mentions_link: 'https://github.com/{u}', // Changes the link generated by @mentions. Only applies if with_github_mentions option is enabled.
        with_email_obfuscation: true, // Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities
        with_link_open_new_window: false, // Open all links in new windows
        with_html_tag_backslash_escaping: false, // Support for HTML Tag escaping. ex: \<div>foo\</div>
        with_emojis: false, // Enable emoji support. Ex: `this is a :smile: emoji`
        with_underscore_underlines: false, // Enable support for underline. Syntax is double or triple underscores: `__underline word__`. With this option enabled, underscores no longer parses into `<em>` and `<strong>`
        with_html_document_frame: false, // Outputs a complete html document, including `<html>`, `<head>` and `<body>` tags
        fetch_metadata: false, // Enable support for document metadata (defined at the top of the document between `«««` and `»»»` or between `---` and `---`).
        with_adjacent_blockquote_splitting: false, // Split adjacent blockquote blocks
      },
      standard: {
        no_codeblock_newline: true,
        autolink_simple: false,
        midword_underscores_are_literals: true,
        with_strikethrough: true,
        with_tables: true,
        with_github_codeblocks: true,
        with_tasklists: true,
        no_4space_indented_sublists: true,
        with_html_tag_backslash_escaping: true,
        with_adjacent_blockquote_splitting: true
      },
      github: {
        no_header_id: false,
        no_codeblock_newline: true,
        autolink_simple: true,
        autolink_no_trailing_url_punctuation: true,
        midword_underscores_are_literals: true,
        with_strikethrough: true,
        with_tables: true,
        with_table_header_ids: true,
        with_github_codeblocks: true,
        with_tasklists: true,
        no_4space_indented_sublists: true,
        with_simple_line_breaks: true,
        with_space_before_heading_text_requirement: true,
        header_id_github: true,
        with_github_mentions: true,
        with_html_tag_backslash_escaping: true,
        with_emojis: true,
        with_adjacent_blockquote_splitting: true
      },
    }
  };

  sd.extension = function(name, extension) {
    'use strict';
    if((name===undefined) && (extension===undefined)) return Object.keys(extensions_);
    if(!aux.isString(name)) throw Error('Extension \'name\' must be a string');
    name = names.replace(/[_?*+\/\\.^-]/g, '').replace(/\s/g, '').toLowerCase();
    if(extension === undefined) {
      return (extensions_.hasOwnProperty(name)) ? (extensions_[name]) : (undefined);
    } else if(extension === null) {
      if(extensions_.hasOwnProperty(name)) delete extensions_[name];
      return sd;
    } else {
      if(typeof(extension) === 'function') extension = extension();
      if(!Array.isArray(extension)) extension = [extension];
      // Validate
      for(var i=0; i<extension.length; ++i) {
        const baseMsg = ((name) ? ('Error in ' + name + ' extension->') : ('Error in unnamed extension')) + ' sub-extension ' + i + ': ';
        const ext = extension[i];
        if(typeof ext !== 'object') throw new Error(baseMsg + 'must be an object, but ' + typeof ext + ' given');
        if(!aux.isString(ext.type)) throw new Error(baseMsg + 'property "type" must be a string, but ' + typeof ext.type + ' given');
        const type = ext.type = ext.type.toLowerCase();
        if(type === 'language' || type === 'input') type = ext.type = 'lang';
        if(type === 'html') type = ext.type = 'output';
        if(type !== 'lang' && type !== 'output' && type !== 'hook') throw new Error(baseMsg + 'type ' + type + ' is not recognized. Valid values: "lang/language", "output/html" or "hook"');
        if(type === 'hook') {
          if(ext.hooks === undefined) throw new Error(baseMsg + '. Extensions of type "hook" must have a property called "hooks"');
        } else {
          if((ext.filter === undefined) && (ext.regex === undefined)) throw new Error(baseMsg + type + ' extensions must define either a "regex" property or a "filter" method');
        }
        if(ext.hooks) {
          if(typeof ext.hooks !== 'object') throw new Error(baseMsg + '"hooks" property must be an object but ' + typeof ext.hooks + ' given');
          for(var ln in ext.hooks) {
            if(!ext.hooks.hasOwnProperty(ln)) continue;
            if(typeof ext.hooks[ln] !== 'function') throw new Error(baseMsg + '"hooks" property must be an hash of [event name]: [callback]. hooks.' + ln + ' must be a function but ' + typeof ext.hooks[ln] + ' given');
          }
        }
        if(ext.filter) {
          if(typeof ext.filter !== 'function') throw new Error(baseMsg + '"filter" must be a function, but ' + typeof ext.filter + ' given');
        } else if(ext.regex) {
          if(aux.isString(ext.regex)) ext.regex = new RegExp(ext.regex, 'g');
          if(!(ext.regex instanceof RegExp)) throw new Error(baseMsg + '"regex" property must either be a string or a RegExp object, but ' + typeof ext.regex + ' given');
          if(!(aux.isFunction(ext.replace) || aux.isString(ext.replace))) throw new Error(baseMsg + '"regex" extensions must implement a replace string or function');
        }
      }
      extensions_[name] = extension;
      return sd;
    }
  };

  sd.emojis = function(code_value_pairs) {
    if(code_value_pairs !== undefined) {
      if(code_value_pairs === null) {
        aux.emojis = {};
      } else if(typeof(code_value_pairs) !== 'object') {
        throw new Error("emojis(): Argument not an object containing emoji-code-replacement-pairs.");
      } else {
        for(var key in code_value_pairs) {
          if(code_value_pairs.hasOwnProperty(key)) aux.emojis[key] = code_value_pairs[key];
        }
      }
      return sd;
    } else {
      return JSON.parse(JSON.stringify(aux.emojis));
    }
  }

  sd.convert = function(markdown, options) {
    return (markdown===undefined) ? ("") : ((new sd.MarkdownToHtmlConverter(options||{})).convert(markdown));
  }

  sd.MarkdownToHtmlConverter = function(opts) {
    'use strict';
    const this_converter = this;
    var options_ = {};
    var hooks_ = {};
    var metadata_ = { parsed: {}, raw: '', format: '' };

    this.hook = function(name, callback) {
      if(!aux.isString(name)) throw Error('Invalid argument in converter.hook() method: name must be a string, but ' + typeof name + ' given');
      if(typeof(callback) !== 'function') throw Error('Invalid argument in converter.hook() method: callback must be a function, but ' + typeof callback + ' given');
      if(!hooks_.hasOwnProperty(name)) hooks_[name] = [];
      hooks_[name].push(callback);
      return this;
    };

    this.options = function() {
      return options_;
    };

    this.meta = function() {
      return metadata_;
    };

    this.convert = function(text) {
      'use strict';
      if(!text) return text;

      const state = {
        converter: this,
        htmlblocks: [],
        htmlspans: [],
        urls: {},
        titles: {},
        dimensions: {},
        listlevel: 0,
        linkcounts: {},
        codeblocks: [],
        metadata: { parsed: {}, raw: '', format: '' },

        hook: function(id, text, options, state) {
          if(!hooks_.hasOwnProperty(id)) return text;
          hooks_[id].filter(function(fn) {
            const txt = fn(id, text, this_converter, options, state);
            if(txt !== undefined) text = txt;
          })
          return text;
        },
        push_html: function(text) {
          return ('\n\n¨K' + (state.htmlblocks.push(text)-1) + 'K\n\n');
        }
      };

      text = text.replace(/¨/g, '¨T');
      text = text.replace(/\$/g, '¨D');
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'); // newline unification.
      if(options_.with_smart_indentation_fix) text = text.replace(new RegExp('^\\s{0,' + (text.match(/^\s*/)[0].length) + '}', 'gm'), '');
      text = '\n\n' + text + '\n\n';
      text = sd.parsers['detab'](text, options_, state);
      text = text.replace(/^[ \t]+$/mg, '');
      for(var extn in extensions_) extensions_[extn].filter(function(proc) {
        if(proc.lang) text = sd.parsers['extensionproc'](proc.lang, text, options_, state);
      });
      text = sd.parsers['metadata'](text, options_, state);
      text = sd.parsers['precodetags'](text, options_, state);
      text = sd.parsers['githubcodeblocks'](text, options_, state);
      text = sd.parsers['htmltags'](text, options_, state);
      text = sd.parsers['codetags'](text, options_, state);
      text = sd.parsers['linkdefinitions'](text, options_, state);
      text = sd.parsers['blockgamut'](text, options_, state);
      text = sd.parsers['unescapecodeblocks'](text, options_, state);
      text = sd.parsers['unescapehtmlspans'](text, options_, state);
      text = sd.parsers['unescapespecialchars'](text, options_, state);
      text = text.replace(/\u00A0/g, '&nbsp;');
      text = text.replace(/¨D/g, '$$');
      text = text.replace(/¨T/g, '¨');
      text = sd.parsers['htmldocument'](text, options_, state);
      for(var extn in extensions_) extensions_[extn].filter(function(proc) {
        if(proc.output) text = sd.parsers['extensionproc'](proc.output, text, options_, state);
      });
      metadata_ = state.metadata;
      return text;
    };

    (function(){
      opts = opts || {};
      if(typeof(opts) !== 'object') throw new Error('Converter expects the passed parameter to be an object, but ' + typeof(opts) + ' was passed instead.');
      const baseopts = sd.flavors()['original'];
      for(var key in baseopts) options_[key] = baseopts[key];
      if(opts.flavor && (typeof(opts.flavor) === 'string')) { // flavour specialization
        var fl;
        try { fl = sd.flavors()[opts.flavor]; } catch(ex) {}
        if(fl === undefined) throw new Error(opts.flavor + ' flavor was not found');
        for(var key in fl) options_[key] = fl[key];
      }
      for(var key in opts) options_[key] = opts[key]; // specific overrides
    })();
  };

  sd.parsers = {

    detab: function(text, options, state) {
      // Convert all tabs to spaces
      'use strict';
      text = state.hook('detab.before', text, options, state);
      text = text.replace(/\t(?=\t)/g, '    '); // g_tab_width
      text = text.replace(/\t/g, '¨A¨B');
      text = text.replace(/¨B(.+?)¨A/g, function(wm, m1) {
        var leadingText = m1;
        const numSpaces = 4 - leadingText.length % 4;  // g_tab_width
        for(var i=0; i<numSpaces; i++) leadingText += ' ';
        return leadingText;
      });
      text = text.replace(/¨A/g, '    ');  // g_tab_width
      text = text.replace(/¨B/g, '');
      text = state.hook('detab.after', text, options, state);
      return text;
    },

    metadata: function(text, options, state) {
      // Parse metadata at the top of the document
      'use strict';
      if(!options.fetch_metadata) return text;
      text = state.hook('metadata.before', text, options, state);
      const parseMetadataContents = function(content) {
        state.metadata.raw = content;
        content = content.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
        content = content.replace(/\n {4}/g, ' ');
        content.replace(/^([\S ]+): +([\s\S]+?)$/gm, function(wm, key, value) { state.metadata.parsed[key] = value; return ''; });
      }
      text = text.replace(/^\s*«««+(\S*?)\n([\s\S]+?)\n»»»+\n/, function(wholematch, format, content) {
        parseMetadataContents(content);
        return '¨M';
      });
      text = text.replace(/^\s*---+(\S*?)\n([\s\S]+?)\n---+\n/, function(wholematch, format, content) {
        if(format) state.metadata.format = format;
        parseMetadataContents(content);
        return '¨M';
      });
      text = text.replace(/¨M/g, '');
      text = state.hook('metadata.after', text, options, state);
      return text;
    },

    precodetags: function(text, options, state) {
      // Hash and escape <pre><code> elements that should not be parsed as markdown
      'use strict';
      text = state.hook('precodetags.before', text, options, state);
      const repl = function(wm, match, left, right) {
        const codeblock = left + sd.parsers['codeliterals'](match, options, state) + right;
        return '\n\n¨G' + (state.codeblocks.push({text: wm, codeblock: codeblock}) - 1) + 'G\n\n';
      };
      text = aux.replace_r(text, repl, '^ {0,3}<pre\\b[^>]*>\\s*<code\\b[^>]*>', '^ {0,3}</code>\\s*</pre>', 'gim');
      text = state.hook('precodetags.after', text, options, state);
      return text;
    },

    githubcodeblocks: function(text, options, state) {
    'use strict';
      if(!options.with_github_codeblocks) return text;
      text = state.hook('githubcodeblocks.before', text, options, state);
      text += '¨0';
      text = text.replace(/(?:^|\n)(?: {0,3})(```+|~~~+)(?:\s*)([^\s`~]*)\n([\s\S]*?)\n(?: {0,3})\1/g, function(wm, delim, language, codeblock) {
        const end = (options.no_codeblock_newline) ? '' : '\n';
        codeblock = sd.parsers['codeliterals'](codeblock, options, state);
        codeblock = sd.parsers['detab'](codeblock, options, state);
        codeblock = codeblock.replace(/^\n+/g, '').replace(/\n+$/g, ''); // trim newlines
        codeblock = '<pre><code' + (language ? ' class="' + language + ' language-' + language + '"' : '') + '>' + codeblock + end + '</code></pre>';
        codeblock = sd.parsers['htmlblock'](codeblock, options, state);
        return '\n\n¨G' + (state.codeblocks.push({text: wm, codeblock: codeblock}) - 1) + 'G\n\n';
      });
      text = text.replace(/¨0/g, '');
      return state.hook('githubcodeblocks.after', text, options, state);
    },

    htmltags: function(text, options, state) {
      'use strict';
      text = state.hook('htmltags.before', text, options, state);
      const blockTags = [
        'pre','div','h1','h2','h3','h4','h5','h6','blockquote','table','dl','ol','ul','script','noscript','form','fieldset',
        'iframe','math','style','section','header','footer','nav','article','aside','address','audio','canvas','figure','hgroup',
        'output','video','p'
      ];
      if(options.with_html_tag_backslash_escaping) {
        text = text.replace(/\\<(\/?[^>]+?)>/g, function(wm, inside) {
          return '&lt;' + inside + '&gt;';
        });
      }
      const repl = function(wholeMatch, match, left, right) {
        var txt = wholeMatch;
        if(left.search(/\bmarkdown\b/) >= 0) txt = left + state.converter.makeHtml(match) + right;
        return state.push_html(txt);
      };
      for(var i=0; i<blockTags.length; ++i) {
        var opTagPos;
        var rgx1 = new RegExp('^ {0,3}(<' + blockTags[i] + '\\b[^>]*>)', 'im');
        var patLeft  = '<' + blockTags[i] + '\\b[^>]*>';
        var patRight = '</' + blockTags[i] + '>';
        while((opTagPos = aux.regexIndexOf(text, rgx1)) !== -1) {
          var subTexts = aux.splitAtIndex(text, opTagPos);
          var newSubText1 = aux.replace_r(subTexts[1], repl, patLeft, patRight, 'im');
          if(newSubText1 === subTexts[1]) break;
          text = subTexts[0].concat(newSubText1);
        }
      }
      text = text.replace(/(\n {0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, sd.parsers['htmlelement'](text, options, state));
      text = aux.replace_r(text, function(txt) { return state.push_html(txt); }, '^ {0,3}<!--', '-->', 'gm');
      text = text.replace(/(?:\n\n)( {0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, sd.parsers['htmlelement'](text, options, state));
      text = state.hook('htmltags.after', text, options, state);
      return text;
    },

    codetags: function(text, options, state) {
      // Hash and escape <code> elements that should not be parsed as markdown
      'use strict';
      text = state.hook('codetags.before', text, options, state);
      const repl = function(wholeMatch, match, left, right) {
        const codeblock = left + sd.parsers['codeliterals'](match, options, state) + right;
        return '¨C' + (state.htmlspans.push(codeblock) - 1) + 'C';
      };
      text = aux.replace_r(text, repl, '<code\\b[^>]*>', '</code>', 'gim');
      text = state.hook('codetags.after', text, options, state);
      return text;
    },

    linkdefinitions: function(text, options, state) {
    // Strips link definitions from text, stores the URLs and titles in hash references.
    // Link defs are in the form: ^[id]: url "optional title"
    'use strict';
      text += '¨0';
      const repl = function(wholeMatch, linkId, url, width, height, blankLines, title) {
        linkId = linkId.toLowerCase();
        if(url.match(/^data:.+?\/.+?;base64,/)) {
          state.urls[linkId] = url.replace(/\s/g, '');
        } else {
          state.urls[linkId] = sd.parsers['htmlspecialchars'](url, options, state);  // Link IDs are case-insensitive
        }
        if(blankLines) {
          return blankLines + title;
        } else {
          if(title) {
            state.titles[linkId] = title.replace(/"|'/g, '&quot;');
          }
          if(options.fetch_image_dimensions && width && height) {
            state.dimensions[linkId] = {
              width:  width,
              height: height
            };
          }
        }
        return '';
      };
      text = text.replace(/^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n\n|(?=¨0)|(?=\n\[))/gm, repl);
      text = text.replace(/^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?([^>\s]+)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=¨0))/gm, repl);
      text = text.replace(/¨0/, '');
      return text;
    },

    blockgamut: function(text, options, state) {
      // These are all the transformations that form block-level tags like paragraphs, headers, and list items.
      'use strict';
      text = state.hook('blockgamut.before', text, options, state);
      text = sd.parsers['blockquotes'](text, options, state);
      text = sd.parsers['headers'](text, options, state);
      text = sd.parsers['horizontalRule'](text, options, state);
      text = sd.parsers['lists'](text, options, state);
      text = sd.parsers['codeblocks'](text, options, state);
      text = sd.parsers['tables'](text, options, state);
      text = sd.parsers['htmltags'](text, options, state);
      text = sd.parsers['paragraphs'](text, options, state);
      text = state.hook('blockgamut.after', text, options, state);
      return text;
    },

    anchors: function(text, options, state) {
      // Turn Markdown link shortcuts into XHTML <a> tags.
      'use strict';
      text = state.hook('anchors.before', text, options, state);
      const atag = function(wholeMatch, linkText, linkId, url, m5, m6, title) {
        if(title===undefined) title = '';
        linkId = linkId.toLowerCase();
        if(wholeMatch.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
          url = '';
        } else if(!url) {
          if(!linkId) linkId = linkText.toLowerCase().replace(/ ?\n/g, ' ');
          url = '#' + linkId;
          if(state.urls[linkId] !== undefined) {
            url = state.urls[linkId];
            if(state.titles[linkId] !== undefined) title = state.titles[linkId];
          } else {
            return wholeMatch;
          }
        }
        url = url.replace(/([*_:~])/g, aux.escapeCharactersCallback);
        var result = '<a href="' + url + '"';
        if(title !== '' && title !== null) {
          title = title.replace(/"/g, '&quot;');
          title = title.replace(/([*_:~])/g, aux.escapeCharactersCallback);
          result += ' title="' + title + '"';
        }
        if(options.with_link_open_new_window && !/^#/.test(url)) {
          result += ' rel="noopener noreferrer" target="¨E95Eblank"';
        }
        result += '>' + linkText + '</a>';
        return result;
      };
      text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)] ?(?:\n *)?\[(.*?)]()()()()/g, atag);
      text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<([^>]*)>(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g, atag);
      text = text.replace(/\[((?:\[[^\]]*]|[^\[\]])*)]()[ \t]*\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?:[ \t]*((["'])([^"]*?)\5))?[ \t]?\)/g, atag);
      text = text.replace(/\[([^\[\]]+)]()()()()()/g, atag);
      if(options.with_github_mentions && options.github_mentions_link) {
        text = text.replace(/(^|\s)(\\)?(@([a-z\d]+(?:[a-z\d.-]+?[a-z\d]+)*))/gmi, function(wm, st, escape, mentions, username) {
          if(escape === '\\') {
            return st + mentions;
          }
          if(!aux.isString(options.github_mentions_link)) {
            throw new Error('github_mentions_link option must be a string');
          }
          var lnk = options.github_mentions_link.replace(/\{u}/g, username),
              target = '';
          if(options.with_link_open_new_window) {
            target = ' rel="noopener noreferrer" target="¨E95Eblank"';
          }
          return st + '<a href="' + lnk + '"' + target + '>' + mentions + '</a>';
        });
      }
      text = state.hook('anchors.after', text, options, state);
      return text;
    },

    links: function(text, options, state, simplified) {
      'use strict';
      const linkrepl = function(options) {
        'use strict';
        return function(wm, leadingMagicChars, link, m2, m3, trailingPunctuation, trailingMagicChars) {
          link = link.replace(/([*_:~])/g, aux.escapeCharactersCallback);
          var lnkTxt = link,
              append = '',
              target = '',
              lmc    = leadingMagicChars || '',
              tmc    = trailingMagicChars || '';
          if(/^www\./i.test(link)) {
            link = link.replace(/^www\./i, 'http://www.');
          }
          if(options.autolink_no_trailing_url_punctuation && trailingPunctuation) {
            append = trailingPunctuation;
          }
          if(options.with_link_open_new_window) {
            target = ' rel="noopener noreferrer" target="¨E95Eblank"';
          }
          return lmc + '<a href="' + link + '"' + target + '>' + lnkTxt + '</a>' + append + tmc;
        };
      };
      const mailrepl = function(options, state) {
        'use strict';
        return function(wm, b, mail) {
          var href = 'mailto:';
          b = b || '';
          mail = sd.parsers['unescapespecialchars'](mail, options, state);
          if(options.with_email_obfuscation) {
            href = aux.obfuscateEmail(href + mail);
            mail = aux.obfuscateEmail(mail);
          } else {
            href = href + mail;
          }
          return b + '<a href="' + href + '">' + mail + '</a>';
        };
      };
      if(!simplified) {
        text = state.hook('links.before', text, options, state);
        var delimUrlRegex   = /()<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)()>()/gi;
        text = text.replace(delimUrlRegex, linkrepl(options));
        var delimMailRegex  = /<()(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi;
        text = text.replace(delimMailRegex, mailrepl(options, state));
        text = state.hook('links.after', text, options, state);
      } else {
        if(!options.autolink_simple) return text;
        text = state.hook('simplifiedAutoLinks.before', text, options, state);
        if(options.autolink_no_trailing_url_punctuation) {
          var simpleURLRegex2 = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+?)([.!?,()\[\]])?(\1)?(?=\s|$)(?!["<>])/gi;
          text = text.replace(simpleURLRegex2, linkrepl(options));
        } else {
          var simpleURLRegex  = /([*~_]+|\b)(((https?|ftp|dict):\/\/|www\.)[^'">\s]+?\.[^'">\s]+?)()(\1)?(?=\s|$)(?!["<>])/gi;
          text = text.replace(simpleURLRegex, linkrepl(options));
        }
        var simpleMailRegex = /(^|\s)(?:mailto:)?([A-Za-z0-9!#$%&'*+-/=?^_`{|}~.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?=$|\s)/gmi;
        text = text.replace(simpleMailRegex, mailrepl(options, state));
        text = state.hook('simplifiedAutoLinks.after', text, options, state);
      }
      return text;
    },

    blockquotes: function(text, options, state) {
      'use strict';
      text = state.hook('blockquotes.before', text, options, state);
      text = text + '\n\n';
      const re = (options.with_adjacent_blockquote_splitting) ? (/^ {0,3}>[\s\S]*?(?:\n\n)/gm) : (/(^ {0,3}>[ \t]?.+\n(.+\n)*\n*)+/gm);
      text = text.replace(re, function(bq) {
        bq = bq.replace(/^[ \t]*>[ \t]?/gm, ''); // trim one level of quoting
        bq = bq.replace(/¨0/g, '');
        bq = bq.replace(/^[ \t]+$/gm, ''); // trim whitespace-only lines
        bq = sd.parsers['githubcodeblocks'](bq, options, state);
        bq = sd.parsers['blockgamut'](bq, options, state); // recurse
        bq = bq.replace(/(^|\n)/g, '$1  ');
        bq = bq.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function(wm, m1) { return m1.replace(/^  /mg, '¨0').replace(/¨0/g, ''); });
        return sd.parsers['htmlblock']('<blockquote>\n' + bq + '\n</blockquote>', options, state);
      });
      text = state.hook('blockquotes.after', text, options, state);
      return text;
    },

    codeblocks: function(text, options, state) {
      // Process Markdown `<pre><code>` blocks.
      'use strict';
      text = state.hook('codeblocks.before', text, options, state);
      text += '¨0';
      text = text.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=¨0))/g, function(wm, m1, m2) {
        var codeblock=m1, nextChar=m2, end='\n';
        codeblock = sd.parsers['outdent'](codeblock, options, state);
        codeblock = sd.parsers['codeliterals'](codeblock, options, state);
        codeblock = sd.parsers['detab'](codeblock, options, state);
        codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
        codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing newlines
        if(options.no_codeblock_newline) end = '';
        codeblock = '<pre><code>' + codeblock + end + '</code></pre>';
        return sd.parsers['htmlblock'](codeblock, options, state) + nextChar;
      });
      text = text.replace(/¨0/, '');
      text = state.hook('codeblocks.after', text, options, state);
      return text;
    },

    codespans: function(text, options, state) {
      /*
       *
       *   *  Backtick quotes are used for <code></code> spans.
       *
       *   *  You can use multiple backticks as the delimiters if you want to
       *     include literal backticks in the code span. So, this input:
       *
       *         Just type ``foo `bar` baz`` at the prompt.
       *
       *       Will translate to:
       *
       *         <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
       *
       *    There's no arbitrary limit to the number of backticks you
       *    can use as delimters. If you need three consecutive backticks
       *    in your code, use four for delimiters, etc.
       *
       *  *  You can use spaces to get literal backticks at the edges:
       *
       *         ... type `` `bar` `` ...
       *
       *       Turns to:
       *
       *         ... type <code>`bar`</code> ...
       */
      'use strict';
      text = state.hook('codespans.before', text, options, state);
      if(text === undefined) text = '';
      text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm, function(wm, m1, m2, m3) {
        var c = m3;
        c = c.replace(/^([ \t]*)/g, '');	// leading whitespace
        c = c.replace(/[ \t]*$/g, '');	// trailing whitespace
        c = sd.parsers['codeliterals'](c, options, state);
        c = m1 + '<code>' + c + '</code>';
        c = sd.parsers['htmlspans'](c, options, state);
        return c;
      });
      text = state.hook('codespans.after', text, options, state);
      return text;
    },

    ellipsis: function(text, options, state) {
      'use strict';
      text = state.hook('ellipsis.before', text, options, state);
      text = text.replace(/\.\.\./g, '…');
      text = state.hook('ellipsis.after', text, options, state);
      return text;
    },

    emoji: function(text, options, state) {
      'use strict';
      if(!options.with_emojis) return text;
      text = state.hook('emoji.before', text, options, state);
      text = text.replace(/:([\S]+?):/g, function(wm, emojiCode) {
        return ((typeof(options.emojis)==='object') && (options.emojis.hasOwnProperty(emojiCode))) ? (options.emojis[emojiCode]) :
               ((aux.emojis.hasOwnProperty(emojiCode)) ? (aux.emojis[emojiCode]) : (wm));
      });
      text = state.hook('emoji.after', text, options, state);
      return text;
    },

    htmlspecialchars: function(text, options, state) {
      // Smart processing for ampersands and angle brackets that need to be encoded.
      'use strict';
      text = state.hook('htmlspecialchars.before', text, options, state);
      text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;');
      text = text.replace(/<(?![a-z\/?$!])/gi, '&lt;');
      text = text.replace(/</g, '&lt;');
      text = text.replace(/>/g, '&gt;');
      text = state.hook('htmlspecialchars.after', text, options, state);
      return text;
    },

    backslashescapes: function(text, options, state) {
      'use strict';
      text = state.hook('backslashescapes.before', text, options, state);
      text = text.replace(/\\(\\)/g, aux.escapeCharactersCallback);
      text = text.replace(/\\([`*_{}\[\]()>#+.!~=|-])/g, aux.escapeCharactersCallback);
      text = state.hook('backslashescapes.after', text, options, state);
      return text;
    },

    codeliterals: function(text, options, state) {
     // Encode/escape certain characters inside Markdown code runs.
     // The point is that in code, these characters are literals,
     // and lose their special Markdown meanings.
     'use strict';
      text = state.hook('codeliterals.before', text, options, state);
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/([*_{}\[\]\\=~-])/g, aux.escapeCharactersCallback);
      text = state.hook('codeliterals.after', text, options, state);
      return text;
    },

    htmlattributes: function(text, options, state) {
      // Within tags -- meaning between < and > -- encode [\ ` * _ ~ =] so they
      // don't conflict with their use in Markdown for code, italics and strong.
      'use strict';
      text = state.hook('htmlattributes.before', text, options, state);
      text = text.replace(/<\/?[a-z\d_:-]+(?:[\s]+[\s\S]+?)?>/gi, function(m0) { // tags
        return m0.replace(/(.)<\/?code>(?=.)/g, '$1`').replace(/([\\`*_~=|])/g, aux.escapeCharactersCallback);
      });
      text = text.replace(/<!(--(?:(?:[^>-]|-[^>])(?:[^-]|-[^-])*)--)>/gi, function(m0) { // comments
        return m0.replace(/([\\`*_~=|])/g, aux.escapeCharactersCallback);
      });
      text = state.hook('htmlattributes.after', text, options, state);
      return text;
    },

    htmlblock: function(text, options, state) {
      'use strict';
      text = state.hook('htmlblock.before', text, options, state);
      text = text.replace(/(^\n+|\n+$)/g, '');
      text = state.push_html(text);
      text = state.hook('htmlblock.after', text, options, state);
      return text;
    },

    htmlelement: function(text, options, state) {
      'use strict';
      return function(wm, m1) {
        var blockText = m1;
        blockText = blockText.replace(/\n\n/g, '\n');
        blockText = blockText.replace(/^\n/, '');
        blockText = blockText.replace(/\n+$/g, '');
        return state.push_html(blockText);
      };
    },

    htmlspans: function(text, options, state) {
      // Hash span elements that should not be parsed as markdown
      'use strict';
      text = state.hook('htmlspans.before', text, options, state);
      const span = function(html) { return '¨C' + (state.htmlspans.push(html)-1) + 'C'; }
      text = text.replace(/<[^>]+?\/>/gi, span);
      text = text.replace(/<([^>]+?)>[\s\S]*?<\/\1>/g, span);
      text = text.replace(/<([^>]+?)\s[^>]+?>[\s\S]*?<\/\1>/g, span);
      text = text.replace(/<[^>]+?>/gi, span);
      //aux.match_r(text, '<code\\b[^>]*>', '</code>', 'gi');
      text = state.hook('htmlspans.after', text, options, state);
      return text;
    },

    headers: function(text, options, state) {
      'use strict';
      const headerId = function(m) {
        var title, prefix;
        if(options.customizedHeaderId) {
          var match = m.match(/\{([^{]+?)}\s*$/);
          if(match && match[1]) m = match[1];
        }
        title = m;
        if(aux.isString(options.header_id_prefix)) {
          prefix = options.header_id_prefix;
        } else if(options.header_id_prefix === true) {
          prefix = 'section-';
        } else {
          prefix = '';
        }
        if(!options.header_id_raw_prefix) {
          title = prefix + title;
        }
        if(options.header_id_github) {
          title = title.replace(/ /g, '-').replace(/&amp;/g, '').replace(/¨T/g, '').replace(/¨D/g, '').replace(/[&+$,\/:;=?@"#{}|^¨~\[\]`\\*)(%.!'<>]/g, '').toLowerCase();
        } else if(options.header_id_raw) {
          title = title.replace(/ /g, '-').replace(/&amp;/g, '&').replace(/¨T/g, '¨').replace(/¨D/g, '$').replace(/["']/g, '-').toLowerCase();
        } else {
          title = title.replace(/[^\w]/g, '').toLowerCase();
        }
        if(options.header_id_raw_prefix) {
          title = prefix + title;
        }
        if(state.linkcounts[title]) {
          title = title + '-' + (state.linkcounts[title]++);
        } else {
          state.linkcounts[title] = 1;
        }
        return title;
      }

      text = state.hook('headers.before', text, options, state);
      var headerLevelStart = (isNaN(parseInt(options.header_start_level))) ? 1 : parseInt(options.header_start_level);
      var setextRegexH1 = (options.with_livepreview_fix) ? /^(.+)[ \t]*\n={2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n=+[ \t]*\n+/gm;
      var setextRegexH2 = (options.with_livepreview_fix) ? /^(.+)[ \t]*\n-{2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n-+[ \t]*\n+/gm;
      text = text.replace(setextRegexH1, function(wholeMatch, m1) {
        var spangamut = sd.parsers['spangamut'](m1, options, state);
        var hID = (options.no_header_id) ? '' : ' id="' + headerId(m1) + '"';
        var hLevel = headerLevelStart;
        var htmlblock = '<h' + hLevel + hID + '>' + spangamut + '</h' + hLevel + '>';
        return sd.parsers['htmlblock'](htmlblock, options, state);
      });
      text = text.replace(setextRegexH2, function(matchFound, m1) {
        var spangamut = sd.parsers['spangamut'](m1, options, state);
        var hID = (options.no_header_id) ? '' : ' id="' + headerId(m1) + '"';
        var hLevel = headerLevelStart + 1;
        var htmlblock = '<h' + hLevel + hID + '>' + spangamut + '</h' + hLevel + '>';
        return sd.parsers['htmlblock'](htmlblock, options, state);
      });
      const atxStyle = (options.with_space_before_heading_text_requirement) ? /^(#{1,6})[ \t]+(.+?)[ \t]*#*\n+/gm : /^(#{1,6})[ \t]*(.+?)[ \t]*#*\n+/gm;
      text = text.replace(atxStyle, function(wholeMatch, m1, m2) {
        var hText = m2;
        if(options.customizedHeaderId) hText = m2.replace(/\s?\{([^{]+?)}\s*$/, '');
        var span = sd.parsers['spangamut'](hText, options, state);
        var hID = (options.no_header_id) ? '' : ' id="' + headerId(m2) + '"';
        var hLevel = headerLevelStart - 1 + m1.length;
        var header = '<h' + hLevel + hID + '>' + span + '</h' + hLevel + '>';
        return sd.parsers['htmlblock'](header, options, state);
      });
      text = state.hook('headers.after', text, options, state);
      return text;
    },

    horizontalRule: function(text, options, state) {
      // Turn Markdown link shortcuts into XHTML <a> tags.
      'use strict';
      text = state.hook('horizontalRule.before', text, options, state);
      const key = sd.parsers['htmlblock']('<hr />', options, state);
      text = text.replace(/^ {0,2}( ?-){3,}[ \t]*$/gm, key);
      text = text.replace(/^ {0,2}( ?\*){3,}[ \t]*$/gm, key);
      text = text.replace(/^ {0,2}( ?_){3,}[ \t]*$/gm, key);
      text = state.hook('horizontalRule.after', text, options, state);
      return text;
    },

    images: function(text, options, state) {
      // Turn Markdown image shortcuts into <img> tags.
      'use strict';
      text = state.hook('images.before', text, options, state);
      const img = function(wm, altText, linkId, url, width, height, m5, title) {
        linkId = linkId.toLowerCase();
        if(!title) title = '';
        if(wm.search(/\(<?\s*>? ?(['"].*['"])?\)$/m) > -1) {
          url = '';
        } else if(url === '' || url === null) {
          if(linkId === '' || linkId === null) {
            linkId = altText.toLowerCase().replace(/ ?\n/g, ' ');
          }
          url = '#' + linkId;
          if(state.urls[linkId] !== undefined) {
            url = state.urls[linkId];
            if(state.titles[linkId] !== undefined) {
              title = state.titles[linkId];
            }
            if(state.dimensions[linkId] !== undefined) {
              width = state.dimensions[linkId].width;
              height = state.dimensions[linkId].height;
            }
          } else {
            return wm;
          }
        }
        altText = altText.replace(/"/g, '&quot;').replace(/([*_:~])/g, aux.escapeCharactersCallback);
        url = url.replace(/([*_:~])/g, aux.escapeCharactersCallback);
        var result = '<img src="' + url + '" alt="' + altText + '"';
        if(title && aux.isString(title)) {
          title = title.replace(/"/g, '&quot;').replace(/([*_:~])/g, aux.escapeCharactersCallback);
          result += ' title="' + title + '"';
        }
        if(width && height) {
          width  = (width === '*') ? 'auto' : width;
          height = (height === '*') ? 'auto' : height;
          result += ' width="' + width + '"';
          result += ' height="' + height + '"';
        }
        result += ' />';
        return result;
      }
      const img64 = function(m0, altText, linkId, url, width, height, m5, title) {
        return img(m0, altText, linkId, url.replace(/\s/g, ''), width, height, m5, title);
      }
      text = text.replace(/!\[([^\]]*?)] ?(?:\n *)?\[([\s\S]*?)]()()()()()/g, img); // reference
      text = text.replace(/!\[([^\]]*?)][ \t]*()\([ \t]?<?(data:.+?\/.+?;base64,[A-Za-z0-9+/=\n]+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g, img64); // base64
      text = text.replace(/!\[([^\]]*?)][ \t]*()\([ \t]?<([^>]*)>(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(?:(["'])([^"]*?)\6))?[ \t]?\)/g, img); // "crazy"
      text = text.replace(/!\[([^\]]*?)][ \t]*()\([ \t]?<?([\S]+?(?:\([\S]*?\)[\S]*?)?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(["'])([^"]*?)\6)?[ \t]?\)/g, img); // inline
      text = text.replace(/!\[([^\[\]]+)]()()()()()/g, img); // ref shortcut
      text = state.hook('images.after', text, options, state);
      return text;
    },

    spandecorators: function(text, options, state) {
      'use strict';
      text = state.hook('spandecorators.before', text, options, state);
      const parseInside = function(txt, left, right) {
        if(options.autolink_simple) { txt = sd.parsers['links'](txt, options, state, true); }
        return left + txt + right;
      }
      if(options.midword_underscores_are_literals) {
        text = text.replace(/\b___(\S[\s\S]*?)___\b/g, function(wm, txt) { return parseInside(txt, '<strong><em>', '</em></strong>'); });
        text = text.replace(/\b__(\S[\s\S]*?)__\b/g, function(wm, txt) { return parseInside(txt, '<strong>', '</strong>'); });
        text = text.replace(/\b_(\S[\s\S]*?)_\b/g, function(wm, txt) { return parseInside(txt, '<em>', '</em>'); });
      } else {
        text = text.replace(/___(\S[\s\S]*?)___/g, function(wm, m) { return (/\S$/.test(m)) ? parseInside(m, '<strong><em>', '</em></strong>') : wm; });
        text = text.replace(/__(\S[\s\S]*?)__/g, function(wm, m) { return (/\S$/.test(m)) ? parseInside(m, '<strong>', '</strong>') : wm; });
        text = text.replace(/_([^\s_][\s\S]*?)_/g, function(wm, m) { return (/\S$/.test(m)) ? parseInside(m, '<em>', '</em>') : wm; });
      }
      if(options.midword_asterisks_are_literals) {
        text = text.replace(/([^*]|^)\B\*\*\*(\S[\s\S]*?)\*\*\*\B(?!\*)/g, function(wm, lead, txt) { return parseInside(txt, lead + '<strong><em>', '</em></strong>'); });
        text = text.replace(/([^*]|^)\B\*\*(\S[\s\S]*?)\*\*\B(?!\*)/g, function(wm, lead, txt) { return parseInside(txt, lead + '<strong>', '</strong>'); });
        text = text.replace(/([^*]|^)\B\*(\S[\s\S]*?)\*\B(?!\*)/g, function(wm, lead, txt) { return parseInside(txt, lead + '<em>', '</em>'); });
      } else {
        text = text.replace(/\*\*\*(\S[\s\S]*?)\*\*\*/g, function(wm, m) { return (/\S$/.test(m)) ? parseInside(m, '<strong><em>', '</em></strong>') : wm; });
        text = text.replace(/\*\*(\S[\s\S]*?)\*\*/g, function(wm, m) { return (/\S$/.test(m)) ? parseInside(m, '<strong>', '</strong>') : wm; });
        text = text.replace(/\*([^\s*][\s\S]*?)\*/g, function(wm, m) { return (/\S$/.test(m)) ? parseInside(m, '<em>', '</em>') : wm; });
      }
      text = state.hook('spandecorators.after', text, options, state);
      return text;
    },

    lists: function(text, options, state) {
      // Form HTML ordered (numbered) and unordered (bulleted) lists.
      'use strict';
      const processListItems = function(listStr, trimTrailing) {
        "use strict";
        // Process the contents of a single ordered or unordered list, splitting it into individual list items.
        state.listlevel++;
        listStr = listStr.replace(/\n{2,}$/, '\n');
        listStr += '¨0';
        var rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0| {0,3}([*+-]|\d+[.])[ \t]+))/gm;
        var isParagraphed = (/\n[ \t]*\n(?!¨0)/.test(listStr));
        if(options.no_4space_indented_sublists) {
          rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0|\2([*+-]|\d+[.])[ \t]+))/gm;
        }
        listStr = listStr.replace(rgx, function(wm, m1, m2, m3, m4, taskbtn, checked) {
          checked = (checked && checked.trim() !== '');
          var item = sd.parsers['outdent'](m4, options, state);
          var bulletStyle = '';
          if(taskbtn && options.with_tasklists) {
            bulletStyle = ' class="task-list-item" style="list-style-type: none;"';
            item = item.replace(/^[ \t]*\[(x|X| )?]/m, function() {
              var otp = '<input type="checkbox" disabled style="margin: 0px 0.35em 0.25em -1.6em; vertical-align: middle;"';
              if(checked) otp += ' checked';
              otp += '>';
              return otp;
            });
          }
          item = item.replace(/^([-*+]|\d\.)[ \t]+[\S\n ]*/g, function(wm2) { return '¨A' + wm2; });
          if(m1 || (item.search(/\n{2,}/) > -1)) {
            item = sd.parsers['githubcodeblocks'](item, options, state);
            item = sd.parsers['blockgamut'](item, options, state);
          } else {
            item = sd.parsers['lists'](item, options, state);
            item = item.replace(/\n$/, ''); // chomp(item)
            item = sd.parsers['htmltags'](item, options, state);
            item = item.replace(/\n\n+/g, '\n\n');
            if(isParagraphed) {
              item = sd.parsers['paragraphs'](item, options, state);
            } else {
              item = sd.parsers['spangamut'](item, options, state);
            }
          }
          item = item.replace('¨A', '');
          item =  '<li' + bulletStyle + '>' + item + '</li>\n';
          return item;
        });
        listStr = listStr.replace(/¨0/g, '');
        state.listlevel--;
        if(trimTrailing) listStr = listStr.replace(/\s+$/, '');
        return listStr;
      }
      const styleStartNumber = function(list, listType) {
        if(listType === 'ol') {
          const res = list.match(/^ *(\d+)\./);
          if(res && res[1] !== '1') return ' start="' + res[1] + '"';
        }
        return '';
      }
      const parseConsecutiveLists = function(list, listType, trimTrailing) {
        // Check and parse consecutive lists
        var olRgx = (options.no_4space_indented_sublists) ? (/^ ?\d+\.[ \t]/gm) : (/^ {0,3}\d+\.[ \t]/gm);
        var ulRgx = (options.no_4space_indented_sublists) ? (/^ ?[*+-][ \t]/gm) : (/^ {0,3}[*+-][ \t]/gm);
        var counterRxg = (listType === 'ul') ? olRgx : ulRgx;
        var result = '';
        if(list.search(counterRxg) !== -1) {
          const parseCL = function(txt) {
            var pos = txt.search(counterRxg), style = styleStartNumber(list, listType);
            if(pos !== -1) {
              result += '\n\n<' + listType + style + '>\n' + processListItems(txt.slice(0, pos), !!trimTrailing) + '</' + listType + '>\n';
              listType = (listType === 'ul') ? 'ol' : 'ul';
              counterRxg = (listType === 'ul') ? olRgx : ulRgx;
              parseCL(txt.slice(pos));
            } else {
              result += '\n\n<' + listType + style + '>\n' + processListItems(txt, !!trimTrailing) + '</' + listType + '>\n';
            }
          };
          parseCL(list);
        } else {
          result = '\n\n<' + listType + styleStartNumber(list, listType) + '>\n' + processListItems(list, !!trimTrailing) + '</' + listType + '>\n';
        }
        return result;
      }

      // Start of list parsing
      text = state.hook('lists.before', text, options, state);
      text += '¨0';
      if(state.listlevel) {
        text = text.replace(/^(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
          function(all, list, m2) {
            const listType = (m2.search(/[*+-]/g) > -1) ? 'ul' : 'ol';
            return parseConsecutiveLists(list, listType, true);
          }
        );
      } else {
        text = text.replace(/(\n\n|^\n?)(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
          function(all, m1, list, m3) {
            const listType = (m3.search(/[*+-]/g) > -1) ? 'ul' : 'ol';
            return parseConsecutiveLists(list, listType, false);
          }
        );
      }
      text = text.replace(/¨0/, '');
      text = state.hook('lists.after', text, options, state);
      return text;
    },

    outdent: function(text, options, state) {
      // Remove one level of line-leading tabs or spaces
      'use strict';
      text = state.hook('outdent.before', text, options, state);
      text = text.replace(/^(\t|[ ]{1,4})/gm, '¨0'); // attacklab: g_tab_width
      text = text.replace(/¨0/g, '');
      text = state.hook('outdent.after', text, options, state);
      return text;
    },

    paragraphs: function(text, options, state) {
      'use strict';
      text = state.hook('paragraphs.before', text, options, state);
      text = text.replace(/^\n+/g, '');
      text = text.replace(/\n+$/g, '');
      var grafs = text.split(/\n{2,}/g);
      var grafsOut = [];
      var end = grafs.length; // Wrap <p> tags
      for(var i=0; i<end; ++i) {
        var str = grafs[i];
        if(str.search(/¨(K|G)(\d+)\1/g) >= 0) {
          grafsOut.push(str);
        } else if(str.search(/\S/) >= 0) {
          str = sd.parsers['spangamut'](str, options, state);
          str = str.replace(/^([ \t]*)/g, '<p>');
          str += '</p>';
          grafsOut.push(str);
        }
      }
      // Unhashify HTML blocks
      end = grafsOut.length;
      for(i=0; i<end; ++i) {
        var blockText='', grafsOutIt = grafsOut[i], codeFlag=false;
        var mtc;
        while(mtc=grafsOutIt.match(/¨(K)(\d+)\1/)) {
          var delim=mtc[1], num=mtc[2];
          if(delim === 'K') {
            blockText = state.htmlblocks[num];
          } else if(codeFlag) {
            blockText = sd.parsers['codeliterals'](state.codeblocks[num].text, options, state);
          } else {
            blockText = state.codeblocks[num].codeblock;
          }
          blockText = blockText.replace(/\$/g, '$$$$'); // Escape any dollar signs
          grafsOutIt = grafsOutIt.replace(/(\n\n)?¨(K)\d+\2(\n\n)?/, blockText);
          if(/^<pre\b[^>]*>\s*<code\b[^>]*>/.test(grafsOutIt)) codeFlag = true;
        }
        grafsOut[i] = grafsOutIt;
      }
      text = grafsOut.join('\n');
      text = text.replace(/^\n+/g, '');
      text = text.replace(/\n+$/g, '');
      return state.hook('paragraphs.after', text, options, state);
    },

    spangamut: function(text, options, state) {
      // These are all the transformations that occur *within* block-level tags like paragraphs, headers, and list items.
      'use strict';
      text = state.hook('spangamut.before', text, options, state);
      text = sd.parsers['codespans'](text, options, state);
      text = sd.parsers['htmlattributes'](text, options, state);
      text = sd.parsers['backslashescapes'](text, options, state);
      text = sd.parsers['images'](text, options, state);
      text = sd.parsers['anchors'](text, options, state);
      text = sd.parsers['links'](text, options, state, false);
      text = sd.parsers['links'](text, options, state, true);
      text = sd.parsers['emoji'](text, options, state);
      text = sd.parsers['underline'](text, options, state);
      text = sd.parsers['spandecorators'](text, options, state);
      text = sd.parsers['strikethrough'](text, options, state);
      text = sd.parsers['ellipsis'](text, options, state);
      text = sd.parsers['htmlspans'](text, options, state);
      text = sd.parsers['htmlspecialchars'](text, options, state);
      if(options.with_simple_line_breaks) {
        if(!/\n\n¨K/.test(text)) {
          text = text.replace(/\n+/g, '<br />\n');
        }
      } else {
        text = text.replace(/  +\n/g, '<br />\n');
      }
      text = state.hook('spangamut.after', text, options, state);
      return text;
    },

    strikethrough: function(text, options, state) {
      'use strict';
      if(options.with_strikethrough) {
        text = state.hook('strikethrough.before', text, options, state);
        text = text.replace(/(?:~){2}([\s\S]+?)(?:~){2}/g, function(wm, txt) {
          if(options.autolink_simple) txt = sd.parsers['links'](txt, options, state, true);
          return '<del>' + txt + '</del>';
        });
        text = state.hook('strikethrough.after', text, options, state);
      }
      return text;
    },

    tables: function(text, options, state) {
      'use strict';
      if(!options.with_tables) return text;

      const parseStyles = function(s) {
        if(/^:[ \t]*--*$/.test(s)) return ' style="text-align:left;"';
        if(/^--*[ \t]*:[ \t]*$/.test(s)) return ' style="text-align:right;"';
        if(/^:[ \t]*--*[ \t]*:$/.test(s)) return ' style="text-align:center;"';
        return '';
      }
      const parseHeaders = function(header, style) {
        var id = '';
        header = header.trim();
        if(options.with_table_header_ids) {
          id = ' id="' + header.replace(/ /g, '_').toLowerCase() + '"';
        }
        header = sd.parsers['spangamut'](header, options, state);
        return '<th' + id + style + '>' + header + '</th>\n';
      }
      const parseCells = function(cell, style) {
        var subText = sd.parsers['spangamut'](cell, options, state);
        return '<td' + style + '>' + subText + '</td>\n';
      }
      const buildTable = function(headers, cells) {
        var tb = '<table>\n<thead>\n<tr>\n';
        var tblLgn = headers.length;
        for(var i=0; i<tblLgn; ++i) tb += headers[i];
        tb += '</tr>\n</thead>\n<tbody>\n';
        for(i=0; i<cells.length; ++i) {
          tb += '<tr>\n';
          for(var ii=0; ii<tblLgn; ++ii) tb += cells[i][ii];
          tb += '</tr>\n';
        }
        tb += '</tbody>\n</table>\n';
        return tb;
      }
      const parseTable = function(rawTable) {
        var i, tableLines = rawTable.split('\n');
        for(i = 0; i < tableLines.length; ++i) {
          if(/^ {0,3}\|/.test(tableLines[i])) {
            tableLines[i] = tableLines[i].replace(/^ {0,3}\|/, '');
          }
          if(/\|[ \t]*$/.test(tableLines[i])) {
            tableLines[i] = tableLines[i].replace(/\|[ \t]*$/, '');
          }
          tableLines[i] = sd.parsers['codespans'](tableLines[i], options, state);
        }
        var rawHeaders = tableLines[0].split('|').map(function(s) { return s.trim();});
        var rawStyles = tableLines[1].split('|').map(function(s) { return s.trim();});
        var rawCells = [];
        var headers = [];
        var styles = [];
        var cells = [];
        tableLines.shift();
        tableLines.shift();
        for(i = 0; i < tableLines.length; ++i) {
          if(tableLines[i].trim() === '') continue;
          rawCells.push(tableLines[i].split('|').map(function(s) { return s.trim(); }));
        }
        if(rawHeaders.length < rawStyles.length) {
          return rawTable;
        }
        for(i=0; i<rawStyles.length; ++i) {
          styles.push(parseStyles(rawStyles[i]));
        }
        for(i=0; i<rawHeaders.length; ++i) {
          if(styles[i] === undefined) styles[i] = '';
          headers.push(parseHeaders(rawHeaders[i], styles[i]));
        }
        for(i=0; i<rawCells.length; ++i) {
          var row = [];
          for(var ii=0; ii<headers.length; ++ii) {
            if(rawCells[i][ii] === undefined) {} // @todo check
            row.push(parseCells(rawCells[i][ii], styles[ii]));
          }
          cells.push(row);
        }
        return buildTable(headers, cells);
      }
      text = state.hook('tables.before', text, options, state);
      text = text.replace(/\\(\|)/g, aux.escapeCharactersCallback);
      text = text.replace(/^ {0,3}\|?.+\|.+\n {0,3}\|?[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:[-=]){2,}[\s\S]+?(?:\n\n|¨0)/gm, parseTable); // multi column
      text = text.replace(/^ {0,3}\|.+\|[ \t]*\n {0,3}\|[ \t]*:?[ \t]*(?:[-=]){2,}[ \t]*:?[ \t]*\|[ \t]*\n( {0,3}\|.+\|[ \t]*\n)*(?:\n|¨0)/gm, parseTable); // single column
      text = state.hook('tables.after', text, options, state);
      return text;
    },

    underline: function(text, options, state) {
      'use strict';
      if(!options.with_underscore_underlines) return text;
      text = state.hook('underline.before', text, options, state);
      if(options.midword_underscores_are_literals) {
        text = text.replace(/\b___(\S[\s\S]*?)___\b/g, function(wm, txt) {
          return '<u>' + txt + '</u>';
        });
        text = text.replace(/\b__(\S[\s\S]*?)__\b/g, function(wm, txt) {
          return '<u>' + txt + '</u>';
        });
      } else {
        text = text.replace(/___(\S[\s\S]*?)___/g, function(wm, m) {
          return (/\S$/.test(m)) ? '<u>' + m + '</u>' : wm;
        });
        text = text.replace(/__(\S[\s\S]*?)__/g, function(wm, m) {
          return (/\S$/.test(m)) ? '<u>' + m + '</u>' : wm;
        });
      }
      text = text.replace(/(_)/g, aux.escapeCharactersCallback);
      text = state.hook('underline.after', text, options, state);
      return text;
    },

    unescapecodeblocks: function(text, options, state) {
      'use strict';
      text = state.hook('unescapecodeblocks.before', text, options, state);
      var mtc, codeFlag = false;
      while(mtc=text.match(/¨(K|G)(\d+)\1/)) {
        var delim=mtc[1], num=mtc[2];
        var blockText=''
        if(delim === 'K') {
          blockText = state.htmlblocks[num];
        } else if(codeFlag) {
          blockText = sd.parsers['codeliterals'](state.codeblocks[num].text, options, state);
        } else {
          blockText = state.codeblocks[num].codeblock;
        }
        blockText = blockText.replace(/\$/g, '$$$$'); // Escape any dollar signs
        text = text.replace(/(\n\n)?¨(K|G)\d+\2(\n\n)?/, blockText);
        if(/^<pre\b[^>]*>\s*<code\b[^>]*>/.test(text)) codeFlag = true;
      }
      text = text.replace(/^\n+/g, '');
      text = text.replace(/\n+$/g, '');
      return state.hook('unescapecodeblocks.after', text, options, state);
    },

    unescapespecialchars: function(text, options, state) {
      'use strict';
      text = state.hook('unescapespecialchars.before', text, options, state);
      text = text.replace(/¨E(\d+)E/g, function(all, m1) { return String.fromCharCode(parseInt(m1)); });
      text = state.hook('unescapespecialchars.after', text, options, state);
      return text;
    },

    unescapehtmlspans: function(text, options, state) {
      'use strict';
      text = state.hook('unescapehtmlspans.before', text, options, state);
      for(var i = 0; i < state.htmlspans.length; ++i) {
        var repText = state.htmlspans[i], limit = 0;
        var mtc;
        while(mtc=repText.match(/¨C(\d+)C/)) {
          var num = mtc[1];
          repText = repText.replace('¨C' + num + 'C', state.htmlspans[num]);
          if(limit === 100) {
            aux.warn('maximum nesting of 100 spans reached!');
            break;
          }
          ++limit;
        }
        text = text.replace('¨C' + i + 'C', repText);
      }
      text = state.hook('unescapehtmlspans.after', text, options, state);
      return text;
    },

    htmldocument: function(text, options, state) {
      // Create a full HTML document from the processed markdown
      'use strict';
      if(!options.with_html_document_frame) return text;
      text = state.hook('htmldocument.before', text, options, state);
      var doctype = 'html';
      var doctypeParsed = '<!doctype html>\n';
      var title = '';
      var charset = '<meta charset="utf-8">\n';
      var lang = '';
      var metadata = '';
      if(typeof state.metadata.parsed.doctype !== 'undefined') {
        doctypeParsed = '<!DOCTYPE ' +  state.metadata.parsed.doctype + '>\n';
        doctype = state.metadata.parsed.doctype.toString().toLowerCase();
        if(doctype === 'html' || doctype === 'html5') charset = '<meta charset="utf-8">';
      }
      for(var meta in state.metadata.parsed) {
        if(!state.metadata.parsed.hasOwnProperty(meta)) continue;
        switch(meta.toLowerCase()) {
          case 'doctype':
            break;
          case 'title':
            title = '<title>' +  state.metadata.parsed.title + '</title>\n';
            break;
          case 'charset':
            if(doctype === 'html' || doctype === 'html5') {
              charset = '<meta charset="' + state.metadata.parsed.charset + '">\n';
            } else {
              charset = '<meta name="charset" content="' + state.metadata.parsed.charset + '">\n';
            }
            break;
          case 'language':
          case 'lang':
            lang = ' lang="' + state.metadata.parsed[meta] + '"';
            metadata += '<meta name="' + meta + '" content="' + state.metadata.parsed[meta] + '">\n';
            break;
          default:
            metadata += '<meta name="' + meta + '" content="' + state.metadata.parsed[meta] + '">\n';
        }
      }
      text = doctypeParsed + '<html' + lang + '>\n<head>\n' + title + charset + metadata + '</head>\n<body>\n' + text.trim() + '\n</body>\n</html>';
      text = state.hook('htmldocument.after', text, options, state);
      return text;
    },

    extensionproc: function(ext, text, options, state) {
      'use strict';
      if(ext.filter) {
        text = ext.filter(text, state.converter, options);
      } else if(ext.regex) {
        text = text.replace(ext.regex, ext.replace);
      }
      return text;
    }

  };

  if(document!==undefined && window!==undefined) {
    if(window.util===undefined) window.util={};
    window.util.mdconverter = sd;
  }
  return sd;
})();
