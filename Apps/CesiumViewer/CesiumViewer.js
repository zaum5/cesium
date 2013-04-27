/*global define*/
define([
        'dojo/_base/window',
        'dojo/dom-class',
        'dojo/io-query',
        'dojo/parser',
        'dojo/ready',
        'Core/Math',
        'Core/Extent',
        'Scene/Polygon',
        'Scene/CesiumTerrainProvider',
        'Scene/PostProcessFilter',
        'Shaders/PostProcessFilters/BlackAndWhite',
        'Shaders/PostProcessFilters/NightVision',
        'Shaders/PostProcessFilters/Toon',
        'Shaders/PostProcessFilters/Lomo',
        'Widgets/Dojo/checkForChromeFrame',
        'Widgets/Dojo/CesiumViewerWidget'
    ], function(
        win,
        domClass,
        ioQuery,
        parser,
        ready,
        CesiumMath,
        Extent,
        Polygon,
        CesiumTerrainProvider,
        PostProcessFilter,
        BlackAndWhite,
        NightVision,
        Toon,
        Lomo,
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

        var widget = new CesiumViewerWidget({
            endUserOptions : endUserOptions,
            enableDragDrop : true
        });
        widget.placeAt('cesiumContainer');
        widget.startup();
        widget.fullscreen.viewModel.fullscreenElement(document.body);

// TODO: remove before pull request
        widget.centralBody.terrainProvider = new CesiumTerrainProvider({
            url : 'http://cesium.agi.com/smallterrain'
        });

        var scene = widget.scene;
//        var filter = new PostProcessFilter({ source : 'vec4 czm_getFilter(czm_FilterInput filterInput) { return texture2D(czm_color, filterInput.st).rrra; }' });
//        var filter = new PostProcessFilter({ source : BlackAndWhite });
//        var filter = new PostProcessFilter({ source : NightVision });
//        var filter = new PostProcessFilter({ source : Toon });
        var filter = new PostProcessFilter({ source : Lomo });
        scene.postProcessFilters = [filter];

        var polygon = new Polygon();
        polygon.configureExtent(
            new Extent(
                CesiumMath.toRadians(-140.0),
                CesiumMath.toRadians(50.0),
                CesiumMath.toRadians(-100.0),
                CesiumMath.toRadians(70.0)));
        scene.getPrimitives().add(polygon);

        domClass.remove(win.body(), 'loading');
    });
});