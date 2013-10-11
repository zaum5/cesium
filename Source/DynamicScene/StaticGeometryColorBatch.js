/*global define*/
define(['../Core/defined',
        '../Core/DeveloperError',
        '../Core/Dictionary',
        '../Core/GeometryInstance',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        '../Scene/PerInstanceColorAppearance'
    ], function(
        defined,
        DeveloperError,
        Dictionary,
        GeometryInstance,
        ColorGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        Primitive,
        PerInstanceColorAppearance) {
    "use strict";

    var StaticGeometryColorBatch = function(scene, translucent) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        this._scene = scene;
        this._primitives = scene.getPrimitives();
        this._geometry = new Dictionary();
        this._updaters = new Dictionary();
        this._primitive = undefined;
        this._createPrimitive = false;
        this._translucent = translucent;
    };

    StaticGeometryColorBatch.prototype.add = function(updater) {
        var instance = new GeometryInstance({
            id : updater.dynamicObject,
            geometry : updater.createGeometry(),
            attributes : {
                show : new ShowGeometryInstanceAttribute(updater.show),
                color : ColorGeometryInstanceAttribute.fromColor(updater.color)
            }
        });
        this._geometry.add(updater.id, instance);
        this._updaters.add(updater.id, updater);
        this._createPrimitive = true;
    };

    StaticGeometryColorBatch.prototype.remove = function(updater) {
        this._createPrimitive = this._geometry.remove(updater.id) || this._createPrimitive;
        this._updaters.remove(updater.id);
    };

    StaticGeometryColorBatch.prototype.update = function() {
        var primitive = this._primitive;
        var primitives = this._primitives;
        var geometries = this._geometry.getValues();
        if (this._createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
            }
            if (geometries.length > 0) {
                primitive = new Primitive({
                    asynchronous : false,
                    geometryInstances : geometries,
                    appearance : new PerInstanceColorAppearance({
                        translucent : this._translucent
                    })
                });

                primitives.add(primitive);
            }
            this._primitive = primitive;
            this._createPrimitive = false;
        } else {
            var updaters = this._updaters.getValues();
            for (var i = geometries.length - 1; i > -1; i--) {
                var instance = geometries[i];
                var updater = updaters[i];

                var attributes = instance.dynamicAttributes;
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    instance.dynamicAttributes = attributes;
                }
                var color = updater.color;
                if (defined(color)) {
                    attributes.color = ColorGeometryInstanceAttribute.toValue(color, attributes.color);
                }
                var show = updater.show;
                if (defined(show)) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                }
            }
        }
    };

    StaticGeometryColorBatch.prototype.removeAllPrimitives = function() {
        if (defined(this._primitive)) {
            var primitives = this._primitives;
            primitives.remove(this._primitive);
            this._primitive = undefined;
            this._geometry.removeAll();
            this._updaters.removeAll();
        }
    };

    return StaticGeometryColorBatch;
});
