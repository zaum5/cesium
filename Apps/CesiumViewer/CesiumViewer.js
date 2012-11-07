/*global define*/
define([
    'dojo/dom',
    'dojo/on',
    'dojo/ready',
    'dojo/io-query',
    'Widgets/Dojo/CesiumViewerWidget',
    'Core/Matrix4',
    'Core/Cartesian3',
    'Scene/Model',

], function(
    dom,
    on,
    ready,
    ioQuery,
    CesiumViewerWidget,
    Matrix4,
    Cartesian3,
    Model
) {
    "use strict";
    /*global console*/

    ready(function() {
        var endUserOptions = {};
        if (window.location.search) {
            endUserOptions = ioQuery.queryToObject(window.location.search.substring(1));
        }

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt(dom.byId('cesiumContainer'));

        widget.startup();

        var scene = widget.scene;
        var primitives = scene.getPrimitives();
        var m = new Model('../../../Assets/Model/duck/duck.json');
//        m.modelMatrix = Matrix4.fromScale(new Cartesian3(900000.0, 900000.0, 900000.0));
        primitives.add(m);

    });
});
