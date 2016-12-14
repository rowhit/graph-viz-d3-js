define(['viz', 'parser/xdot', 'pegast'], function (viz, xdotparser, pegast) {
  return {
    generate: function (source) {
      var xdot, result;

      xdot = viz(source, { format: "xdot" });

      try {
        var ast = xdotparser.parse(xdot);
        result = this.shapeast(ast);
      } catch(e) {
        throw "Parsing of xdot output failed";
      }
      return result;
    },
    shapeast: function(ast) {
      var result = [];

      function visitSubnodes(propertyName) {
        return function (node) {
          node[propertyName] && node[propertyName].forEach(visit);
        };
      }

      function startGroup(propertyName) {
        return function (node) {
          result.push({id: node.id, class: node.type, shapes: [], labels: []});
          node[propertyName] && node[propertyName].forEach(visit);
        };
      }

      function addElements(node) {
        var cursor = result[result.length - 1];
        cursor.shapes = cursor.shapes.concat(node.elements.filter(function(e){
          return e.shape;
        })).map(fixShapeStyles);
        cursor.labels = cursor.labels.concat(node.elements.filter(function(e){
          return e.text;
        })).map(fixTextStyles);
      }

      function fixShapeStyles(element) {
        if (element.style) {
          var keys = styleKeys(element.style);
          keys.indexOf("fill") < 0 && element.style.push({key: 'fill', value: {red: 255, green: 255, blue: 255, opacity: 0}});
          keys.indexOf("stroke") < 0 && element.style.push({key: 'stroke', value: {red:0, green:0, blue:0, opacity: 1}});
        }
        return element;
      }

      function fixTextStyles(element) {
        if (element.style) {
          var keys = styleKeys(element.style);
          keys.indexOf("text-anchor") < 0 && element.style.push({key: 'text-anchor', value: 'middle'});
        }
        return element;
      }

      function styleKeys(styles) {
        return styles.map(function(e) {
          return e.key;
        });
      }

      var visit = pegast.nodeVisitor({
        digraph: startGroup('commands'),
        graph: visitSubnodes('attributes'),
        subgraph: startGroup('commands'),
        struct: visitSubnodes('commands'),
        node: startGroup('attributes'),
        relation: startGroup('attributes'),
        draw: addElements,
        hdraw: addElements,
        ldraw: addElements,
        size: function(node) {
          var cursor = result[result.length - 1];
          cursor.size = node.value.map(function(e) {
            return e*72;
          });
        }
      });
      visit(ast);

      return {
        main: result.shift(),
        groups: result
      };
    }
  };
});