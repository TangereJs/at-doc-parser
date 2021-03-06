(function(scope) {

  var DocParser = {
    parse: function(text, existing) {
      var top = existing;
      var entities = [];
      var current = top;
      var subCurrent = {};

      var scriptDocCommentClause = '\\/\\*\\*([\\s\\S]*?)\\*\\/';
      var htmlDocCommentClause = '<!--([\\s\\S]*?)-->';

      // matches text between /** and */ inclusive and <!-- and --> inclusive
      var docCommentRegex = new RegExp(scriptDocCommentClause + '|' + htmlDocCommentClause, 'g');

      // acquire all script doc comments
      var docComments = text.match(docCommentRegex) || [];

      // each match represents a single block of doc comments
      docComments.forEach(function(m) {
        // unify line ends, remove all comment characters, split into individual lines
        var lines = m.replace(/\r\n/g, '\n').replace(/^\s*\/\*\*|^\s*\*\/|^\s*\* ?|^\s*\<\!-\-|^s*\-\-\>/gm, '').split('\n');

        // pragmas (@-rules) must occur on a line by themselves
        var pragmas = [];
        // filter lines whose first non-whitespace character is @ into the pragma list
        // (and out of the `lines` array)
        lines = lines.filter(function(l) {
          var m = l.match(/\s*@([\w-]*) (.*)/);
          if (!m) {
            return true;
          }
          pragmas.push(m);
        });

        // collect all other text into a single block
        var code = lines.join('\n');

        // process pragmas
        pragmas.forEach(function(m) {
          var pragma = m[1],
            content = m[2];
          switch (pragma) {

            // currently all entities are either @class or @element
            case 'class':
            case 'element':
              current.name = content;
              current.description = code;

              entities.push(current);
              break;

              // an entity may have these describable sub-features
            case 'attribute':
            case 'property':
            case 'method':
            case 'event':
              var nonemptyLines = lines.filter(function(line){ return line.length > 0; });
              code = nonemptyLines.join('\n');
              subCurrent = {
                name: content,
                description: code,
                private: content.charAt(0) === '_' ? true : false
              };

              var label = pragma == 'property' ? 'properties' : pragma + 's';
              makePragma(current, label, subCurrent);
              break;

              // sub-feature pragmas
            case 'default':
            case 'type':
              subCurrent[pragma] = content;
              break;

            case 'param':
              var eventParmsRe = /\{(.+)\}\s+(\w+[.\w+]+)\s+(.*)$/;

              var params = content.match(eventParmsRe);
              if (params) {
                var subEventObj = {
                  type: params[1],
                  name: params[2],
                  description: params[3]
                };
                makePragma(subCurrent, pragma + 's', subEventObj);
              }

              break;

            case 'extends':
            case 'mixins':
              var parts = content.split(' ');
              var subObj = {
                name: parts[0],
                url: parts[1] || null
              };
              makePragma(current, pragma, subObj);
              break;

            case 'return':
              var returnRe = /\{(.+)\}\s+(.*)$/;

              var returnReResult = content.match(returnRe);
              if (returnReResult) {
                var subReturnObj = {
                  type: returnReResult[1],
                  description: returnReResult[2]
                };
                subCurrent[pragma] = subReturnObj;
              }
              break;

              // everything else
            default:
              current[pragma] = content;
              break;
          }
        });

        // utility function, yay hoisting
        function makePragma(object, pragma, content) {
          var p$ = object;
          var p = p$[pragma];
          var index, length, isFound, existing;

          if (!p) {
            p$[pragma] = p = [];
          } else {
            length = p.length;
            for (index = 0; index < length; index++) {
              if (p[index].name === content.name) {
                isFound = true;
                existing = p[index];
                break;
              }
            }
            if (isFound) {
              Object.keys(content).forEach(function (key, index) {
                existing[key] = content[key];
              });
              subCurrent = existing;
            } else {
              p.push(content);
            }
          }
        }

      });

      if (entities.length === 0) {
        entities.push(current);
        // entities.push({
        //   name: 'Entity',
        //   description: '**Undocumented**'
        // });
      }
      return entities;
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocParser;
  } else {
    scope.DocParser = DocParser;
  }

})(this);
