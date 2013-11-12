/*global define*/
define(['../Core/DeveloperError'], function(DeveloperError) {
    "use strict";

    var GeometryUpdater = function(dynamicObject) {
        this.id = undefined;
        this.dynamicObject = undefined;
        this.show = undefined;
        this.color = undefined;
        this.material = undefined;
        this.geometryType = undefined;
        this._materialProperty = undefined;
    };

    GeometryUpdater.PerInstanceColorAppearanceType = undefined;
    GeometryUpdater.MaterialAppearanceType = undefined;

    GeometryUpdater.prototype.createGeometryInstance = function() {
    };

    GeometryUpdater.prototype.update = function(time) {
    };

    GeometryUpdater.prototype.destroy = function() {
    };

    GeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryBatchItem(primitives, this);
    };

    var DynamicGeometryBatchItem = function(primitives, geometryUpdater) {
    };

    DynamicGeometryBatchItem.prototype.update = function() {
    };

    DynamicGeometryBatchItem.prototype.destroy = function() {
    };

    return GeometryUpdater;
});
