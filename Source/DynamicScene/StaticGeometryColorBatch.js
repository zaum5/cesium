/*global define*/
define(['../Core/ColorGeometryInstanceAttribute',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Dictionary',
        '../Core/GeometryInstance',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Primitive'
    ], function(
        ColorGeometryInstanceAttribute,
        defined,
        DeveloperError,
        Dictionary,
        GeometryInstance,
        ShowGeometryInstanceAttribute,
        PerInstanceColorAppearance,
        Primitive) {
    "use strict";

    var StaticGeometryColorBatch = function(primitives, translucent) {
        this._primitives = primitives;
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

        var id = updater.id;
        this._geometry.add(id, instance);
        this._updaters.add(id, updater);
        this._createPrimitive = true;
    };

    StaticGeometryColorBatch.prototype.remove = function(updater) {
        var id = updater.id;
        this._createPrimitive = this._geometry.remove(id) || this._createPrimitive;
        this._updaters.remove(id);
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
