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
//        scene.getContext().setValidateShaderProgram(true);
//        scene.getContext().setValidateFramebuffer(true);
//        scene.getContext().setLogShaderCompilation(true);
//        scene.getContext().setThrowOnWebGLError(true);

        var primitives = scene.getPrimitives();

//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_Internet Man 2/Internet Man.json'); // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_A320-200/models/untitled.json');    // OK.  Needs nodes combined.

        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_FA-18_Hornet/model0.json');         // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_M1A2_Abrams/model0.json');          // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_M1043_HMMWV/model0.json');          // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_C-130-Hercules/model0.json');       // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_Ford_Contour_Sedan/model0.json');   // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/_RQ-1_Predator/model0.json');        // OK

//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/duck/duck.json');                     // OK
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/rambler/Rambler.json');               // Can't invert matrix
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/SuperMurdoch/SuperMurdoch.json');     // OK. scale = 9000.0.
//        var m = new Model('../../../Apps/CesiumViewer/Gallery/Models/wine/wine.json');                     // OK.

        m.scale = 900000.0;
//        m.modelMatrix = Matrix4.fromTranslation(new Cartesian3(8000000.0, 0.0, 0.0));
        primitives.add(m);
        scene.getPrimitives().setCentralBody(undefined);
    });
});
