/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/GeometryInstance',
        '../Core/PolygonGeometry',
        './ConstantProperty',
        './ColorMaterialProperty',
        './GeometryBatchType',
        '../Scene/Primitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        defaultValue,
        defined,
        GeometryInstance,
        PolygonGeometry,
        ConstantProperty,
        ColorMaterialProperty,
        GeometryBatchType,
        Primitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Material,
        MaterialProperty) {
    "use strict";

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.height = undefined;
        this.positions = undefined;
        this.stRotation = undefined;
        this.vertexFormat = undefined;
    };

    var PolygonGeometryUpdater = function(dynamicObject) {
        dynamicObject.propertyChanged.addEventListener(PolygonGeometryUpdater.prototype.onDynamicObjectPropertyChanged, this);

        this.id = dynamicObject.id;
        this.dynamicObject = dynamicObject;
        this.show = true;
        this.color = Color.WHITE.clone();
        this.materialProperty = undefined;
        this.material = Material.fromType('Color');
        this.geometryType = GeometryBatchType.NONE;

        this._polygon = undefined;
        this._vertexPositionsProperty = undefined;
        this._showProperty = undefined;
        this._granularityProperty = undefined;
        this._stRotationProperty = undefined;
        this._heightProperty = undefined;
        this._extrudedHeightProperty = undefined;
        this._colorProperty = undefined;
        this._needEvaluation = true;
        this._geometryOptions = new GeometryOptions(dynamicObject);
    };

    PolygonGeometryUpdater.prototype.createGeometryInstance = function() {
        var attributes;
        if (this.geometryType === GeometryBatchType.COLOR) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this.show),
                color : ColorGeometryInstanceAttribute.fromColor(this.color)
            };
        } else if (this.geometryType === GeometryBatchType.MATERIAL) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this.show)
            };
        }

        return new GeometryInstance({
            id : this.dynamicObject,
            geometry : PolygonGeometry.fromPositions(this._geometryOptions),
            attributes : attributes
        });
    };

    PolygonGeometryUpdater.prototype.update = function(time) {
        if (this._needEvaluation) {
            this.evaluate();
        }

        var type = this.geometryType;
        if (type === GeometryBatchType.NONE) {
            return;
        }

        var show = this.show;
        var showProperty = this._showProperty;
        if (defined(showProperty)) {
            show = this.dynamicObject.isAvailable(time) && showProperty.getValue(time);
        } else {
            show = this.dynamicObject.isAvailable(time);
        }
        this.show = show;

        if (!show) {
            return;
        }

        if (type === GeometryBatchType.COLOR) {
            var colorProperty = this._colorProperty;
            if (defined(colorProperty)) {
                this.color = defaultValue(colorProperty.getValue(time, this.color), this.color);
            }
        } else if (type === GeometryBatchType.DYNAMIC) {
            var options = this._geometryOptions;
            var vertexPositionsProperty = this._vertexPositionsProperty;
            if (defined(vertexPositionsProperty)) {
                options.positions = vertexPositionsProperty.getValue(time);
            }

            var granularityProperty = this._granularityProperty;
            if (defined(granularityProperty)) {
                options.granularity = granularityProperty.getValue(time);
            }

            var stRotationProperty = this._stRotationProperty;
            if (defined(stRotationProperty)) {
                options.stRotation = stRotationProperty.getValue(time);
            }

            var heightProperty = this._heightProperty;
            if (defined(heightProperty)) {
                options.height = heightProperty.getValue(time);
            }

            var extrudedHeightProperty = this._extrudedHeightProperty;
            if (defined(extrudedHeightProperty)) {
                options.extrudedHeight = extrudedHeightProperty.getValue(time);
            }

            var materialProperty = this.materialProperty;
            if (defined(materialProperty)) {
                this.material = MaterialProperty.getValue(time, materialProperty, this.material);
            }
        }
    };

    PolygonGeometryUpdater.prototype.evaluate = function() {
        this._needEvaluation = false;

        var dynamicObject = this.dynamicObject;
        var polygon = this._polygon;

        if (polygon !== dynamicObject._polygon) {
            if (defined(polygon)) {
                polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.prototype.onPolygonPropertyChanged, this);
            }
            polygon = dynamicObject._polygon;
            if (defined(polygon)) {
                polygon.propertyChanged.addEventListener(PolygonGeometryUpdater.prototype.onPolygonPropertyChanged, this);
            }
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (!defined(polygon) || !defined(vertexPositionsProperty)) {
            this.geometryType = GeometryBatchType.NONE;
            return;
        }

        var options = this._geometryOptions;
        if (vertexPositionsProperty instanceof ConstantProperty) {
            this._vertexPositionsProperty = undefined;
            options.positions = vertexPositionsProperty.getValue();
        } else {
            this._vertexPositionsProperty = vertexPositionsProperty;
        }

        var showProperty = polygon.show;
        if (defined(showProperty) && showProperty instanceof ConstantProperty) {
            this._showProperty = undefined;
            this.show = showProperty.getValue();
            if (!this.show) {
                this.geometryType = GeometryBatchType.NONE;
                return;
            }
        } else {
            this._showProperty = showProperty;
        }

        var heightProperty = polygon.height;
        if (heightProperty instanceof ConstantProperty) {
            this._heightProperty = undefined;
            options.height = heightProperty.getValue();
        } else {
            this._heightProperty = heightProperty;
        }

        var extrudedHeightProperty = polygon.extrudedHeight;
        if (extrudedHeightProperty instanceof ConstantProperty) {
            this._extrudedHeightProperty = undefined;
            options.extrudedHeight = extrudedHeightProperty.getValue();
        } else {
            this._extrudedHeightProperty = extrudedHeightProperty;
        }

        var stRotationProperty = polygon.stRotation;
        if (stRotationProperty instanceof ConstantProperty) {
            this._stRotationProperty = undefined;
            options.stRotation = stRotationProperty.getValue();
        } else {
            this._stRotationProperty = stRotationProperty;
        }

        var granularityProperty = polygon.granularity;
        if (granularityProperty instanceof ConstantProperty) {
            this._granularityProperty = undefined;
            options.granularity = granularityProperty.getValue();
        } else {
            this._granularityProperty = granularityProperty;
        }

        var material = polygon.material;
        var isColorMaterial = !defined(material) || material instanceof ColorMaterialProperty;
        if (isColorMaterial) {
            if (defined(material)) {
                var colorProperty = material.color;
                if (defined(colorProperty) && colorProperty instanceof ConstantProperty) {
                    this._colorProperty = undefined;
                    this.color = colorProperty.getValue(undefined, this.color);
                } else {
                    this._colorProperty = colorProperty;
                }
            } else {
                this._colorProperty = undefined;
                this.color = Color.WHITE.clone();
            }
        }
        this.materialProperty = material;

        if (defined(this._vertexPositionsProperty) || defined(this._granularityProperty) || defined(this._stRotationProperty) || defined(this._heightProperty) || defined(this._extrudedHeightProperty)) {
            this.geometryType = GeometryBatchType.DYNAMIC;
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
        } else if (!isColorMaterial) {
            this.geometryType = GeometryBatchType.MATERIAL;
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
        } else {
            this.geometryType = GeometryBatchType.COLOR;
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
        }
    };

    PolygonGeometryUpdater.prototype.onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this._needEvaluation = name === 'vertexPositions' || name === 'polygon';
    };

    PolygonGeometryUpdater.prototype.onPolygonPropertyChanged = function(polygon, name, value, oldValue) {
        this._needEvaluation = true;
    };

    PolygonGeometryUpdater.prototype.destroy = function() {
        this.dynamicObject.propertyChanged.removeEventListener(PolygonGeometryUpdater.prototype.onDynamicObjectPropertyChanged, this);
        var polygon = this._polygon;
        if (defined(polygon)) {
            polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.prototype.onPolygonPropertyChanged, this);
        }
    };

    PolygonGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryBatchItem(primitives, this);
    };

    var DynamicGeometryBatchItem = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._geometryUpdater = geometryUpdater;
        this._material = undefined;
        this._granularity = undefined;
        this._height = undefined;
        this._extrudedHeight = undefined;
        this._stRotation = undefined;
        this._show = undefined;
        this._positions = undefined;
        this._primitive = undefined;
        this._translucent = false;
    };

    DynamicGeometryBatchItem.prototype.update = function() {
        var geometryUpdater = this._geometryUpdater;
        var options = geometryUpdater._geometryOptions;
        var positions = options.positions;

        var show = geometryUpdater.show;
        if (!show || !defined(positions)) {
            if (defined(this._primitive)) {
                this._primitive.show = false;
            }
            return;
        }

        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var granularity = options.granularity;
        var stRotation = options.stRotation;
        var material = geometryUpdater.material;

        var translucent = this._translucent;
        if (defined(material) && defined(material.uniforms.color)) {
            translucent = material.uniforms.color.alpha !== 1.0;
        }

        if (!defined(this._primitive) || this._translucent !== translucent || //
            this._granularity !== granularity || //
            this._height !== height || //
            this._extrudedHeight !== extrudedHeight || //
            this._stRotation !== stRotation || //
            this._positions !== positions) {

            this._translucent = translucent;
            this._granularity = granularity;
            this._height = height;
            this._extrudedHeight = extrudedHeight;
            this._stRotation = stRotation;
            this._material = material;
            this._positions = positions;

            this._primitives.remove(this._primitive);
            this._primitive = undefined;

            this._primitive = new Primitive({
                geometryInstances : geometryUpdater.createGeometryInstance(),
                appearance : new MaterialAppearance({
                    material : material,
                    translucent : translucent
                }),
                asynchronous : false
            });
            this._primitives.add(this._primitive);
        }
        this._primitive.show = true;
    };

    DynamicGeometryBatchItem.prototype.destroy = function() {
        this._primitives.remove(this._primitive);
    };

    return PolygonGeometryUpdater;
});
