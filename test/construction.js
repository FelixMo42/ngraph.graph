var test = require('tap').test,
  createGraph = require('..');

test('getLink respects orientation', function(t) {
  var graph = createGraph();
  
  var data = '413'

  graph.addLink(1, 2, data)

  t.equal( graph.getLink(1, 2).data, data, "should get the link")
  t.notOk( graph.getLink(2, 1), "should not get the link")

  t.equal( graph.getLink(1, 2, false).data, data, "should get the link")
  t.equal( graph.getLink(2, 1, false).data, data, "should get the link")
  
  t.end()
})

test('createGraph uses orientation option', function(t) {
  var orientatedGraph = createGraph({oriented: true});
  var nonorientatedGraph = createGraph({oriented: false});

  var data1 = "42"
  var data2 = "2001"

  orientatedGraph.addLink(1, 2, data1)
  orientatedGraph.addLink(2, 3, data1)

  nonorientatedGraph.addLink(1, 2, data1)
  nonorientatedGraph.addLink(2, 3, data1)

  t.equal( orientatedGraph.getLink(1, 2).data, data1, "should get the link")
  t.notOk( orientatedGraph.getLink(2, 1), "should not get the link")

  t.equal( nonorientatedGraph.getLink(1, 2).data, data1, "should get the link")
  t.equal( nonorientatedGraph.getLink(2, 1).data, data1, "should get the link")

  orientatedGraph.forEachLinkedNode(2, function(node, link) {
    t.ok(link.toId === 3, 'Only 3 is connected to node 2, when traversal is oriented');
  });

  nonorientatedGraph.forEachLinkedNode(2, function(node, link) {
    t.ok(link.toId === 3 || link.toId === 2, 'both incoming and outgoing links are visited');
  });

  t.end();
})

test('add node adds node', function(t) {
  var graph = createGraph();
  var customData = '31337';

  var node = graph.addNode(1, customData);

  t.equal(graph.getNodesCount(), 1, 'exactly one node');
  t.equal(graph.getLinksCount(), 0, 'no links');
  t.equal(graph.getNode(1), node, 'invalid node returned by addNode (or getNode)');
  t.equal(node.data, customData, 'data was not set properly');
  t.equal(node.id, 1, 'node id was not set properly');
  t.end();
});

test('hasNode checks node', function(t) {
  var graph = createGraph();

  graph.addNode(1);

  t.ok(graph.hasNode(1), 'node is there');
  t.notOk(graph.hasNode(2), 'should not be here');
  t.end();
});

test('hasLink checks links', function (t) {
  var graph = createGraph();
  graph.addLink(1, 2);
  var link12 = graph.hasLink(1, 2);
  t.ok(link12.fromId === 1 && link12.toId === 2, 'link is found');

  // this is somewhat doubtful... has link will return null, but forEachLinkedNode
  // will actually iterate over this link. Not sure how to have consistency here
  // for now documenting behavior in the test:
  var noLink = graph.hasLink(2, 1);
  t.notOk(noLink, 'hasLink is always directional');

  var obviousNo = graph.hasLink();
  t.notOk(obviousNo, 'No links there');
  t.end();
});

test('hasLink is the same as getLink', function (t) {
  var graph = createGraph();

  t.equals(graph.getLink, graph.hasLink, 'hasLink is synonim for getLink');
  t.end();
});

test('it throw if no node id is passed', function(t) {
  var graph = createGraph();
  t.throws(function() {
    graph.addNode(); // no id, should throw
  }, 'It throws on undefined node');

  t.end();
});

test('it fires update event when node is updated', function(t) {
  t.plan(3);
  var graph = createGraph();
  graph.addNode(1, 'hello');
  graph.on('changed', checkChangedEvent);
  graph.addNode(1, 'world');

  t.end();

  function checkChangedEvent(changes) {
    var change = changes[0];
    t.equals(change.node.id, 1);
    t.equals(change.node.data, 'world');
    t.equals(change.changeType, 'update');
  }
});

test('it can add node with id similar to reserved prototype property', function(t) {
  var graph = createGraph();
  graph.addNode('constructor');
  graph.addLink('watch', 'constructor');

  var iterated = 0;
  graph.forEachNode(function() {
    iterated += 1;
  });

  t.ok(graph.hasLink('watch', 'constructor'));
  t.equals(graph.getLinksCount(), 1, 'one link');
  t.equals(iterated, 2, 'has two nodes');
  t.end();
});

test('add link adds link', function(t) {
  var graph = createGraph();

  var link = graph.addLink(1, 2),
    firstNodeLinks = graph.getLinks(1),
    secondNodeLinks = graph.getLinks(2);

  t.equal(graph.getNodesCount(), 2, 'Two nodes');
  t.equal(graph.getLinksCount(), 1, 'One link');
  t.equal(firstNodeLinks.length, 1, 'number of links of the first node is wrong');
  t.equal(secondNodeLinks.length, 1, 'number of links of the second node is wrong');
  t.equal(link, firstNodeLinks[0], 'invalid link in the first node');
  t.equal(link, secondNodeLinks[0], 'invalid link in the second node');
  t.end();
});

test('it can add multi-edges', function (t) {
  t.plan(5);
  var graph = createGraph({multigraph: true});
  graph.addLink(1, 2, 'first');
  graph.addLink(1, 2, 'second');
  graph.addLink(1, 2, 'third');

  t.equal(graph.getLinksCount(), 3, 'three links!');
  t.equal(graph.getNodesCount(), 2, 'Two nodes');

  graph.forEachLinkedNode(1, function (otherNode, link) {
    t.ok(link.data === 'first' || link.data === 'second' || link.data === 'third', 'Link is here');
  });

  t.end();
});

test('it can produce unique link ids', function (t) {
  t.test('by default links are not unique', function (t) {
    var seen = {};
    var graph = createGraph();
    graph.addLink(1, 2, 'first');
    graph.addLink(1, 2, 'second');
    graph.addLink(1, 2, 'third');
    graph.forEachLink(verifyLinksAreNotUnique);

    var link = graph.getLink(1, 2);
    t.equals(seen[link.id], 3, 'Link 1->2 seen 3 times')

    function verifyLinksAreNotUnique(link) {
      seen[link.id] = (seen[link.id] || 0) + 1;
    }
    t.end();
  });

  t.test('You can create multigraph', function (t) {
    var graph = createGraph({
      multigraph: true
    });

    var seen = {};
    graph.addLink(1, 2, 'first');
    graph.addLink(1, 2, 'second');
    graph.addLink(1, 2, 'third');
    graph.forEachLink(verifyLinkIsUnique);
    t.equals(graph.getLinksCount(), 3, 'All three links are here');
    t.end();

    function verifyLinkIsUnique(link) {
      t.notOk(seen[link.id], link.id + ' is unique');
      seen[link.id] = true;
    }
  });

  t.test('you can sacrifice uniqueness in favor of performance', function (t) {
    var graph = createGraph({ });

    var seen = {};
    graph.addLink(1, 2, 'first');
    graph.addLink(1, 2, 'second');
    graph.addLink(1, 2, 'third');
    graph.forEachLink(noticeLink);
    t.equals(Object.keys(seen).length, 1, 'Only one link id');

    t.end();

    function noticeLink(link) {
      seen[link.id] = true;
    }
  });

  t.end();
});

test('add one node fires changed event', function(t) {
  t.plan(3);
  var graph = createGraph();
  var testNodeId = 'hello world';

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 1, "Only one change should be recorded");
    t.equal(changes[0].node.id, testNodeId, "Wrong node change notification");
    t.equal(changes[0].changeType, 'add', "Add change type expected.");
  });

  graph.addNode(testNodeId);

  t.end();
});

test('add link fires changed event', function(t) {
  t.plan(4);
  var graph = createGraph();
  var fromId = 1,
    toId = 2;

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 3, "Three change should be recorded: node, node and link");
    t.equal(changes[2].link.fromId, fromId, "Wrong link from Id");
    t.equal(changes[2].link.toId, toId, "Wrong link toId");
    t.equal(changes[2].changeType, 'add', "Add change type expected.");
  });

  graph.addLink(fromId, toId);
  t.end();
});

test('remove isolated node remove it', function(t) {
  var graph = createGraph();

  graph.addNode(1);
  graph.removeNode(1);

  t.equal(graph.getNodesCount(), 0, 'Remove operation failed');
  t.end();
});

test('remove link removes it', function(t) {
  t.plan(5);

  var graph = createGraph();
  var link = graph.addLink(1, 2);

  var linkIsRemoved = graph.removeLink(link);

  t.equal(graph.getNodesCount(), 2, 'remove link should not remove nodes');
  t.equal(graph.getLinksCount(), 0, 'No Links');
  t.equal(graph.getLinks(1).length, 0, 'link should be removed from the first node');
  t.equal(graph.getLinks(2).length, 0, 'link should be removed from the second node');
  t.ok(linkIsRemoved, 'Link removal is successful');

  graph.forEachLink(function() {
    test.ok(false, 'No links should be in graph');
  });

  t.end();
});

test('remove link returns false if no link removed', function (t) {
  var graph = createGraph();

  graph.addLink(1, 2);
  var result = graph.removeLink('blah');
  t.notOk(result, 'Link is not removed');

  var alsoNo = graph.removeLink();
  t.notOk(alsoNo, 'No link - no removal');
  t.end();
});

test('remove isolated node fires changed event', function(t) {
  t.plan(4);
  var graph = createGraph();
  graph.addNode(1);

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 1, "One change should be recorded: node removed");
    t.equal(changes[0].node.id, 1, "Wrong node Id");
    t.equal(changes[0].changeType, 'remove', "'remove' change type expected.");
  });

  var result = graph.removeNode(1);
  t.ok(result, 'node is removed');
  t.end();
});

test('remove link fires changed event', function(t) {
  t.plan(3);
  var graph = createGraph();
  var link = graph.addLink(1, 2);

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 1, "One change should be recorded: link removed");
    t.equal(changes[0].link, link, "Wrong link removed");
    t.equal(changes[0].changeType, 'remove', "'remove' change type expected.");
  });

  graph.removeLink(link);
  t.end();
});

test('remove linked node fires changed event', function(t) {
  t.plan(5);
  var graph = createGraph(),
    link = graph.addLink(1, 2),
    nodeIdToRemove = 1;

  graph.on('changed', function(changes) {
    t.ok(changes && changes.length === 2, "Two changes should be recorded: link and node removed");
    t.equal(changes[0].link, link, "Wrong link removed");
    t.equal(changes[0].changeType, 'remove', "'remove' change type expected.");
    t.equal(changes[1].node.id, nodeIdToRemove, "Wrong node removed");
    t.equal(changes[1].changeType, 'remove', "'remove' change type expected.");
  });

  graph.removeNode(nodeIdToRemove);
  t.end();
});

test('remove node with many links removes them all', function(t) {
  var graph = createGraph();
  graph.addLink(1, 2);
  graph.addLink(1, 3);

  graph.removeNode(1);

  t.equal(graph.getNodesCount(), 2, 'remove link should remove one node only');
  t.equal(graph.getLinks(1), null, 'link should be removed from the first node');
  t.equal(graph.getLinks(2).length, 0, 'link should be removed from the second node');
  t.equal(graph.getLinks(3).length, 0, 'link should be removed from the third node');
  graph.forEachLink(function() {
    test.ok(false, 'No links should be in graph');
  });

  t.end();
});

test('remove node returns false when no node removed', function (t) {
  var graph = createGraph();
  graph.addNode('hello');
  var result = graph.removeNode('blah');
  t.notOk(result, 'No "blah" node');
  t.end();
});

test('clearGraph clears graph', function (t) {
  var graph = createGraph();
  graph.addNode('hello');
  graph.addLink(1, 2);
  graph.clear();

  t.equal(graph.getNodesCount(), 0, 'No nodes');
  t.equal(graph.getLinksCount(), 0, 'No links');
  t.end();
});

test('beginUpdate holds events', function(t) {
  var graph = createGraph();
  var changedCount = 0;
  graph.on('changed', function () {
    changedCount += 1;
  });
  graph.beginUpdate();
  graph.addNode(1);
  t.equals(changedCount, 0, 'Begin update freezes updates until `endUpdate()`');
  graph.endUpdate();
  t.equals(changedCount, 1, 'event is fired only after endUpdate()');
  t.end();
});
