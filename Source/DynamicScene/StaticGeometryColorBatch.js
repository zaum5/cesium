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

    var Batch = function(primitives, translucent) {
        this.translucent = translucent;
        this.primitives = primitives;
        this.createPrimitive = false;
        this.primitive = undefined;
        this.geometry = new Dictionary();
        this.updaters = new Dictionary();
    };

    Batch.prototype.add = function(updater) {
        var instance = updater.createGeometryInstance();
        var id = updater.id;
        this.createPrimitive = true;
        this.geometry.add(id, instance);
        this.updaters.add(id, updater);
    };

    Batch.prototype.remove = function(updater) {
        var id = updater.id;
        this.createPrimitive = this.geometry.remove(id) || this.createPrimitive;
        this.updaters.remove(id);
    };

    Batch.prototype.update = function() {
        var primitive = this.primitive;
        var primitives = this.primitives;
        var geometry = this.geometry.getValues();
        if (this.createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
            }
            if (geometry.length > 0) {
                primitive = new Primitive({
                    asynchronous : false,
                    geometryInstances : geometry,
                    appearance : new PerInstanceColorAppearance({
                        translucent : this.translucent,
                        closed : true
                    })
                });

                primitives.add(primitive);
            }
            this.primitive = primitive;
            this.createPrimitive = false;
        } else {
            var updaters = this.updaters.getValues();
            var length = geometry.length;
            for (var i = 0; i < length; i++) {
                var instance = geometry[i];
                var updater = updaters[i];

                var attributes = updater.attributes;
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    updater.attributes = attributes;
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

    Batch.prototype.removeAllPrimitives = function() {
        var primitive = this.primitive;
        if (defined(primitive)) {
            this.primitives.remove(primitive);
            this.primitive = undefined;
            this.geometry.removeAll();
            this.updaters.removeAll();
        }
    };

    var StaticGeometryColorBatch = function(primitives) {
        this._solidBatch = new Batch(primitives, false);
        this._translucentBatch = new Batch(primitives, true);
    };

    StaticGeometryColorBatch.prototype.add = function(updater) {
        var color = updater.color;
        if (defined(color) && color.alpha === 1.0) {
            this._solidBatch.add(updater);
        } else {
            this._translucentBatch.add(updater);
        }
    };

    StaticGeometryColorBatch.prototype.remove = function(updater) {
        if (!this._solidBatch.remove(updater)) {
            this._translucentBatch.remove(updater);
        }
    };

    StaticGeometryColorBatch.prototype.update = function() {
        var i;
        var color;
        var length;
        var updater;
        var updaters;

        //Iterate over each of the current updaters
        //to check if a color swapped from solid to translucent.
        updaters = this._solidBatch.updaters.getValues();
        length = updaters.length;
        for (i = 0; i < length; i++) {
            updater = updaters[i];
            color = updater.color;
            if (!defined(color) || color.alpha !== 1.0) {
                this._solidBatch.remove(updater);
                this._translucentBatch.add(updater);
            }
        }

        updaters = this._translucentBatch.updaters.getValues();
        length = updaters.length;
        for (i = 0; i < length; i++) {
            updater = updaters[i];
            color = updater.color;
            if (defined(color) && color.alpha === 1.0) {
                this._translucentBatch.remove(updater);
                this._solidBatch.add(updater);
            }
        }

        this._solidBatch.update();
        this._translucentBatch.update();
    };

    StaticGeometryColorBatch.prototype.removeAllPrimitives = function() {
        this._solidBatch.removeAllPrimitives();
        this._translucentBatch.removeAllPrimitives();
    };

    return StaticGeometryColorBatch;
});
