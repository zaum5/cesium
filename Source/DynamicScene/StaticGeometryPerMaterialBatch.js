/*global define*/
define(['../Core/defined',
        '../Core/Dictionary',
        '../Core/GeometryInstance',
        '../Core/ShowGeometryInstanceAttribute',
        '../Scene/Primitive',
        '../Scene/MaterialAppearance',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        defined,
        Dictionary,
        GeometryInstance,
        ShowGeometryInstanceAttribute,
        Primitive,
        MaterialAppearance,
        Material,
        MaterialProperty) {
    "use strict";

    var Batch = function(primitives, updater) {
        this._materialProperty = updater.materialProperty;
        this._updaters = new Dictionary();
        this._createPrimitive = true;
        this._primitive = undefined;
        this._primitives = primitives;
        this._geometries = new Dictionary();
        this._material = Material.fromType('Color');
        this.add(updater);
    };

    Batch.prototype.isMaterial = function(updater) {
        var protoMaterial = this._materialProperty;
        var updaterMaterial = updater._materialProperty;
        if (updaterMaterial === protoMaterial) {
            return true;
        }
        if (defined(protoMaterial)) {
            return protoMaterial.equals(updaterMaterial);
        }
        return false;
    };

    Batch.prototype.add = function(updater) {
        this._updaters.add(updater.id, updater);
        this._geometries.add(updater.id, updater.createGeometryInstance());
        this._createPrimitive = true;
    };

    Batch.prototype.remove = function(updater) {
        this._createPrimitive = this._updaters.remove(updater.id);
        this._geometries.remove(updater.id);
        return this._createPrimitive;
    };

    Batch.prototype.update = function(time) {
        var primitive = this._primitive;
        var primitives = this._primitives;
        var geometries = this._geometries.getValues();
        if (this._createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
            }
            if (geometries.length > 0) {
                primitive = new Primitive({
                    asynchronous : false,
                    geometryInstances : geometries,
                    appearance : new MaterialAppearance({
                        material : MaterialProperty.getValue(time, this._materialProperty, this._material),
                        faceForward : true,
                        translucent : false,
                        closed : true
                    })
                });

                primitives.add(primitive);
            }
            this._primitive = primitive;
            this._createPrimitive = false;
        } else {
            this._primitive.appearance.material = MaterialProperty.getValue(time, this._materialProperty, this._material);

            var updaters = this._updaters.getValues();
            for (var i = geometries.length - 1; i > -1; i--) {
                var instance = geometries[i];
                var updater = updaters[i];

                var attributes = updater.attributes;
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    updater.attributes = attributes;
                }
                var show = updater.show;
                if (defined(show)) {
                    attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
                }
            }
        }
    };

    Batch.prototype.destroy = function(time) {
        var primitive = this._primitive;
        var primitives = this._primitives;
        if (defined(primitive)) {
            primitives.remove(primitive);
        }
    };

    var StaticGeometryPerMaterialBatch = function(primitives) {
        this.items = [];
        this._primitives = primitives;
    };

    StaticGeometryPerMaterialBatch.prototype.add = function(updater) {
        var items = this.items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];
            if (item.isMaterial(updater)) {
                item.add(updater);
                return;
            }
        }
        items.push(new Batch(this._primitives, updater));
    };

    StaticGeometryPerMaterialBatch.prototype.remove = function(updater) {
        var items = this.items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            var item = items[i];
            if (item.remove(updater)) {
                break;
            }
        }
    };

    StaticGeometryPerMaterialBatch.prototype.update = function(time) {
        var items = this.items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            items[i].update(time);
        }
    };

    StaticGeometryPerMaterialBatch.prototype.removeAllPrimitives = function() {
        var items = this.items;
        var length = items.length;
        for (var i = 0; i < length; i++) {
            items[i].destroy();
        }
        this.items = [];
    };

    return StaticGeometryPerMaterialBatch;
});
