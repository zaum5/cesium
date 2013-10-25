/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/GeometryInstance',
        '../Core/PolygonGeometry',
        '../Core/PolygonOutlineGeometry',
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
        PolygonOutlineGeometry,
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
        dynamicObject.propertyChanged.addEventListener(PolygonGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);

        this.id = dynamicObject.id;
        this.dynamicObject = dynamicObject;
        this.show = true;
        this.color = Color.WHITE.clone();
        this.outline = false;
        this.outlineColor = Color.BLACK.clone();
        this.material = Material.fromType('Color');
        this.geometryType = GeometryBatchType.NONE;

        this._polygon = undefined;
        this._geometryOptions = new GeometryOptions(dynamicObject);

        this._needEvaluation = true;

        this._dynamicVertexPositions = false;
        this._vertexPositionsProperty = undefined;

        this._dynamicShow = false;
        this._showProperty = undefined;

        this._dynamicGranularity = false;
        this._granularityProperty = undefined;

        this._dynamicMaterial = false;
        this._materialProperty = undefined;

        this._dynamicStRotation = false;
        this._stRotationProperty = undefined;

        this._dynamicHeight = false;
        this._heightProperty = undefined;

        this._dynamicExtrudedHeight = false;
        this._extrudedHeightProperty = undefined;

        this._dynamicColor = false;
        this._colorProperty = undefined;

        this._dynamicOutline = false;
        this._outlineProperty = undefined;

        this._dynamicOutlineColor = false;
        this._outlineColorProperty = undefined;
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

    PolygonGeometryUpdater.prototype.createOutlineGeometryInstance = function() {
        var attributes;
        if (this.geometryType === GeometryBatchType.COLOR) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this.outline),
                color : ColorGeometryInstanceAttribute.fromColor(this.outlineColor)
            };
        } else if (this.geometryType === GeometryBatchType.MATERIAL) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this.outline)
            };
        }

        return new GeometryInstance({
            id : this.dynamicObject,
            geometry : PolygonOutlineGeometry.fromPositions(this._geometryOptions),
            attributes : attributes
        });
    };

    PolygonGeometryUpdater.prototype.update = function(time) {
        if (this._needEvaluation) {
            this._evaluate();
        }

        var type = this.geometryType;
        if (type === GeometryBatchType.NONE) {
            return;
        }

        var show = (!this._dynamicShow || this._showProperty.getValue(time)) && this.dynamicObject.isAvailable(time);
        this.show = show;
        if (!show) {
            return;
        }

        if (type === GeometryBatchType.COLOR && this._dynamicColor) {
            this.color = defaultValue(this._colorProperty.getValue(time, this.color), this.color);
        } else if (type === GeometryBatchType.DYNAMIC) {
            var options = this._geometryOptions;
            if (this._dynamicVertexPositions) {
                options.positions = this._vertexPositionsProperty.getValue(time);
            }

            if (this._dynamicGranularity) {
                options.granularity = this._granularityProperty.getValue(time);
            }

            if (this._dynamicStRotation) {
                options.stRotation = this._stRotationProperty.getValue(time);
            }

            if (this._dynamicHeight) {
                options.height = this._heightProperty.getValue(time);
            }

            if (this._dynamicExtrudedHeight) {
                options.extrudedHeight = this._extrudedHeightProperty.getValue(time);
            }

            if (this._dynamicOutline) {
                this.outline = this._outlineProperty.getValue(time);
            }

            if (this._dynamicOutlineColor) {
                this.outlineColor = this._outlineColorProperty.getValue(time);
            }

            var materialProperty = this._materialProperty;
            if (defined(materialProperty)) {
                this.material = MaterialProperty.getValue(time, materialProperty, this.material);
            }
        }
    };

    PolygonGeometryUpdater.prototype._evaluate = function() {
        this._needEvaluation = false;

        var dynamicObject = this.dynamicObject;
        var polygon = this._polygon;

        if (polygon !== dynamicObject._polygon) {
            if (defined(polygon)) {
                polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.prototype._onPolygonPropertyChanged, this);
            }
            polygon = dynamicObject._polygon;
            if (defined(polygon)) {
                polygon.propertyChanged.addEventListener(PolygonGeometryUpdater.prototype._onPolygonPropertyChanged, this);
            }
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (!defined(polygon) || !defined(vertexPositionsProperty)) {
            this.geometryType = GeometryBatchType.NONE;
            return;
        }

        var isConstant;
        var options = this._geometryOptions;

        if (this._vertexPositionsProperty !== vertexPositionsProperty) {
            isConstant = vertexPositionsProperty instanceof ConstantProperty;
            if (isConstant) {
                options.positions = vertexPositionsProperty.getValue();
            }
            this._dynamicVertexPositions = defined(vertexPositionsProperty) && !isConstant;
            this._vertexPositionsProperty = vertexPositionsProperty;
        }

        var showProperty = polygon.show;
        if (this._showProperty !== showProperty) {
            isConstant = showProperty instanceof ConstantProperty;
            if (isConstant) {
                if (!showProperty.getValue()) {
                    this.geometryType = GeometryBatchType.NONE;
                    return;
                }
            }
            this._dynamicShow = defined(showProperty) && !isConstant;
            this._showProperty = showProperty;
        }

        var heightProperty = polygon.height;
        if (this._heightProperty !== heightProperty) {
            isConstant = heightProperty instanceof ConstantProperty;
            if (isConstant) {
                options.height = heightProperty.getValue();
            }
            this._dynamicHeight = defined(heightProperty) && !isConstant;
            this._heightProperty = heightProperty;
        }

        var extrudedHeightProperty = polygon.extrudedHeight;
        if (this._extrudedHeightProperty !== extrudedHeightProperty) {
            isConstant = extrudedHeightProperty instanceof ConstantProperty;
            if (isConstant) {
                options.extrudedHeight = extrudedHeightProperty.getValue();
            }
            this._dynamicExtrudedHeight = defined(extrudedHeightProperty) && !isConstant;
            this._extrudedHeightProperty = extrudedHeightProperty;
        }

        var stRotationProperty = polygon.stRotation;
        if (this._stRotationProperty !== stRotationProperty) {
            isConstant = stRotationProperty instanceof ConstantProperty;
            if (isConstant) {
                options.stRotation = stRotationProperty.getValue();
            }
            this._dynamicStRotation = defined(stRotationProperty) && !isConstant;
            this._stRotationProperty = stRotationProperty;
        }

        var outlineProperty = polygon.outline;
        if (this._outlineProperty !== outlineProperty) {
            isConstant = outlineProperty instanceof ConstantProperty;
            if (isConstant) {
                this.outline = outlineProperty.getValue();
            }
            this._dynamicOutline = defined(outlineProperty) && !isConstant;
            this._outlineProperty = outlineProperty;
        }

        var outlineColorProperty = polygon.outlineColor;
        if (this._outlineColorProperty !== outlineColorProperty) {
            isConstant = outlineColorProperty instanceof ConstantProperty;
            if (isConstant) {
                this.outlineColor = outlineColorProperty.getValue();
            }
            this._dynamicOutlineColor = defined(outlineColorProperty) && !isConstant;
            this._outlineColorProperty = outlineColorProperty;
        }

        var granularityProperty = polygon.granularity;
        if (this._granularityProperty !== granularityProperty) {
            isConstant = granularityProperty instanceof ConstantProperty;
            if (isConstant) {
                options.granularity = granularityProperty.getValue();
            }
            this._dynamicGranularity = defined(granularityProperty) && !isConstant;
            this._granularityProperty = granularityProperty;
        }

        var materialProperty = polygon.material;
        var isColorMaterial = !defined(materialProperty) || materialProperty instanceof ColorMaterialProperty;
        if (isColorMaterial) {
            if (defined(materialProperty)) {
                var colorProperty = materialProperty.color;
                if (this._colorProperty !== colorProperty) {
                    isConstant = colorProperty instanceof ConstantProperty;
                    if (isConstant) {
                        this.color = colorProperty.getValue();
                    }
                    this._dynamicColor = defined(colorProperty) && !isConstant;
                    this._colorProperty = colorProperty;
                }
            } else {
                this._colorProperty = undefined;
                this.color = Color.WHITE.clone();
            }
        }
        this._materialProperty = materialProperty;

        var geometryType;
        if (this._dynamicVertexPositions || this._dynamicGranularity || this._dynamicStRotation || this._dynamicHeight || this._dynamicExtrudedHeight) {
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.DYNAMIC;
        } else if (!isColorMaterial) {
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.MATERIAL;
        } else {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.COLOR;
        }

        this.geometryType = geometryType;
        return geometryType;
    };

    PolygonGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this._needEvaluation = name === 'vertexPositions' || name === 'polygon';
    };

    PolygonGeometryUpdater.prototype._onPolygonPropertyChanged = function(polygon, name, value, oldValue) {
        this._needEvaluation = true;
    };

    PolygonGeometryUpdater.prototype.destroy = function() {
        this.dynamicObject.propertyChanged.removeEventListener(PolygonGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        var polygon = this._polygon;
        if (defined(polygon)) {
            polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.prototype._onPolygonPropertyChanged, this);
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
                    translucent : translucent,
                    closed : true
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
