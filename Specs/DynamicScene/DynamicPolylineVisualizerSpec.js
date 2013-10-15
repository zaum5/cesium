/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPolylineVisualizer',
             'DynamicScene/GeometryVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicPolyline',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'DynamicScene/ColorMaterialProperty',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Scene/Scene'
            ], function(
              PolylineGeometryUpdater,
              GeometryVisualizer,
              createScene,
              destroyScene,
              ConstantProperty,
              DynamicEllipse,
              DynamicPolyline,
              DynamicObjectCollection,
              DynamicObject,
              ColorMaterialProperty,
              JulianDate,
              Cartesian2,
              Cartesian3,
              Scene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var visualizer;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new GeometryVisualizer(PolylineGeometryUpdater);
        }).toThrow();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no polyline does not create one.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no vertexPosition does not create a polyline.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('A DynamicPolyline causes a primtive to be created and updated.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);

        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);
        polyline.material = new ColorMaterialProperty();
        polyline.width = new ConstantProperty(12.5);

        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);

        polyline.show = new ConstantProperty(false);
        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('clear hides primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = new JulianDate();

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);
        visualizer.update(time);
        scene.render();
        expect(scene.getPrimitives().getLength()).toEqual(1);

        dynamicObjectCollection.removeAll();
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var polyline = testObject.polyline = new DynamicPolyline();

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        polyline.show = new ConstantProperty(true);

        visualizer.update(time);
        scene.render();
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var primitive = scene.getPrimitives().get(0);
        expect(primitive.getGeometryInstanceAttributes(testObject)).toBeDefined();
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        testObject.polyline = new DynamicPolyline();
        testObject.polyline.show = new ConstantProperty(true);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);
        testObject2.polyline = new DynamicPolyline();
        testObject2.polyline.show = new ConstantProperty(true);

        visualizer = new GeometryVisualizer(PolylineGeometryUpdater, scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        scene.render();
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var primitive = scene.getPrimitives().get(0);
        expect(primitive.getGeometryInstanceAttributes(testObject)).toBeDefined();

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        scene.render();
        expect(scene.getPrimitives().getLength()).toEqual(1);
        primitive = scene.getPrimitives().get(0);
        expect(primitive.getGeometryInstanceAttributes(testObject)).toBeUndefined();
        expect(primitive.getGeometryInstanceAttributes(testObject2)).toBeDefined();
    });
}, 'WebGL');