/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        checkForChromeFrame,
        CesiumViewerWidget) {
    "use strict";
    /*global console*/

    ready(function() {
        parser.parse();

        checkForChromeFrame();

        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }
        endUserOptions.source = 'Gallery/DA14/2012_DA14_CA.czml';

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.enableDragDrop = false;
        widget.fullscreenElement = document.body;
        widget.placeAt('cesiumContainer');
        widget.imagery.domNode.style.display = 'none';
        widget.onObjectSelected = function() {
        };
        widget.startup();

        domClass.remove(win.body(), 'loading');

        var zoomButton = document.getElementById('zoomID');
        console.log(zoomButton);
        zoomButton.onclick = function() {
            var lookAtObject = widget.dynamicObjectCollection.getObject('/Application/STK/Scenario/2012_DA14_CA/Satellite/2012_DA14');
            if (typeof widget._viewFromTo === 'undefined' || widget._viewFromTo.dynamicObject !== lookAtObject) {
                widget.centerCameraOnObject(lookAtObject);
            } else {
                widget.viewHome();
            }
        };
    });
});
