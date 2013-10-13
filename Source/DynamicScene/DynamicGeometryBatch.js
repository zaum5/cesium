/*global define*/
define(['../Core/Dictionary'], function(Dictionary) {
    "use strict";

    var DynamicGeometryBatch = function(scene) {
        this._scene = scene;
        this._primitives = scene.getPrimitives();
        this._items = new Dictionary();
    };

    DynamicGeometryBatch.prototype.add = function(updater) {
        this._items.add(updater.id, updater.createDynamicUpdater(this._primitives));
    };

    DynamicGeometryBatch.prototype.remove = function(updater) {
        var id = updater.id;
        var primitive = this._items.getValue(id);
        primitive.destroy();
        this._items.remove(id);
    };

    DynamicGeometryBatch.prototype.update = function() {
        var geometries = this._items.getValues();
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].update();
        }
    };

    DynamicGeometryBatch.prototype.removeAllPrimitives = function() {
        var geometries = this._items.getValues();
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].destroy();
        }
    };

    return DynamicGeometryBatch;
});
