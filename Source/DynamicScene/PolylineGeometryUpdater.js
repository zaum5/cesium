/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/VertexFormat',
        '../Core/GeometryInstance',
        '../Core/PolylineGeometry',
        './ConstantProperty',
        './ColorMaterialProperty',
        './GeometryBatchType',
        '../Scene/Primitive',
        '../Scene/PolylineMaterialAppearance',
        '../Scene/PolylineColorAppearance',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        Color,
        ColorGeometryInstanceAttribute,
        ShowGeometryInstanceAttribute,
        defaultValue,
        defined,
        VertexFormat,
        GeometryInstance,
        PolylineGeometry,
        ConstantProperty,
        ColorMaterialProperty,
        GeometryBatchType,
        Primitive,
        PolylineMaterialAppearance,
        PolylineColorAppearance,
        Material,
        MaterialProperty) {
    "use strict";

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.width = undefined;
        this.positions = undefined;
        this.vertexFormat = undefined;
    };

    var PolylineGeometryUpdater = function(dynamicObject) {
        dynamicObject.propertyChanged.addEventListener(PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);

        this.id = dynamicObject.id;
        this.dynamicObject = dynamicObject;
        this.show = true;
        this.color = Color.WHITE.clone();
        this.material = Material.fromType('Color');
        this.geometryType = GeometryBatchType.NONE;

        this._polyline = undefined;
        this._geometryOptions = new GeometryOptions(dynamicObject);

        this._needEvaluation = true;

        this._dynamicVertexPositions = false;
        this._vertexPositionsProperty = undefined;

        this._dynamicShow = false;
        this._showProperty = undefined;

        this._dynamicWidth = false;
        this._widthProperty = undefined;

        this._dynamicMaterial = false;
        this._materialProperty = undefined;

        this._dynamicColor = false;
        this._colorProperty = undefined;
    };

    PolylineGeometryUpdater.PerInstanceColorAppearanceType = PolylineColorAppearance;
    PolylineGeometryUpdater.MaterialAppearanceType = PolylineMaterialAppearance;

    PolylineGeometryUpdater.prototype.createGeometryInstance = function() {
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
            geometry : new PolylineGeometry(this._geometryOptions),
            attributes : attributes
        });
    };

    PolylineGeometryUpdater.prototype.updateAttributes = function(attributes) {
        var color = this._color;
        if (defined(color)) {
            attributes.color = ColorGeometryInstanceAttribute.toValue(color, attributes.color);
        }
        var show = this._show;
        if (defined(show)) {
            attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
        }
    };

    PolylineGeometryUpdater.prototype.update = function(time) {
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

            if (this._dynamicWidth) {
                options.width = this._widthProperty.getValue(time);
            }

            var materialProperty = this._materialProperty;
            if (defined(materialProperty)) {
                this.material = MaterialProperty.getValue(time, materialProperty, this.material);
            }
        }
    };

    PolylineGeometryUpdater.prototype._evaluate = function() {
        this._needEvaluation = false;

        var dynamicObject = this.dynamicObject;
        var polyline = this._polyline;

        if (polyline !== dynamicObject._polyline) {
            if (defined(polyline)) {
                polyline.propertyChanged.removeEventListener(PolylineGeometryUpdater.prototype._onPolylinePropertyChanged, this);
            }
            polyline = dynamicObject._polyline;
            if (defined(polyline)) {
                polyline.propertyChanged.addEventListener(PolylineGeometryUpdater.prototype._onPolylinePropertyChanged, this);
            }
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (!defined(polyline) || !defined(vertexPositionsProperty)) {
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

        var showProperty = polyline.show;
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

        var widthProperty = polyline.width;
        if (this._widthProperty !== widthProperty) {
            isConstant = widthProperty instanceof ConstantProperty;
            if (isConstant) {
                options.width = widthProperty.getValue();
            }
            this._dynamicWidth = defined(widthProperty) && !isConstant;
            this._widthProperty = widthProperty;
        }

        var materialProperty = polyline.material;
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
        if (this._dynamicVertexPositions || this._dynamicWidth) {
            options.vertexFormat = VertexFormat.ALL;
            geometryType = GeometryBatchType.DYNAMIC;
        } else if (!isColorMaterial) {
            options.vertexFormat = PolylineMaterialAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.MATERIAL;
        } else {
            options.vertexFormat = PolylineColorAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.COLOR;
        }

        this.geometryType = geometryType;
        return geometryType;
    };

    PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this._needEvaluation = name === 'vertexPositions' || name === 'polyline';
    };

    PolylineGeometryUpdater.prototype._onPolylinePropertyChanged = function(polyline, name, value, oldValue) {
        this._needEvaluation = true;
    };

    PolylineGeometryUpdater.prototype.destroy = function() {
        this.dynamicObject.propertyChanged.removeEventListener(PolylineGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        var polyline = this._polyline;
        if (defined(polyline)) {
            polyline.propertyChanged.removeEventListener(PolylineGeometryUpdater.prototype._onPolylinePropertyChanged, this);
        }
    };

    PolylineGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryBatchItem(primitives, this);
    };

    var DynamicGeometryBatchItem = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._geometryUpdater = geometryUpdater;
        this._material = undefined;
        this._width = undefined;
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

        var width = options.width;
        var material = geometryUpdater.material;

        var translucent = this._translucent;
        if (defined(material) && defined(material.uniforms.color)) {
            translucent = material.uniforms.color.alpha !== 1.0;
        }

        if (!defined(this._primitive) || this._translucent !== translucent || //
        this._width !== width || //
        this._positions !== positions) {

            this._translucent = translucent;
            this._width = width;
            this._material = material;
            this._positions = positions;

            this._primitives.remove(this._primitive);
            this._primitive = undefined;

            if (positions.length > 1) {
                this._primitive = new Primitive({
                    geometryInstances : geometryUpdater.createGeometryInstance(),
                    appearance : new PolylineMaterialAppearance({
                        material : material,
                        translucent : translucent,
                        closed : true
                    }),
                    asynchronous : false
                });
                this._primitives.add(this._primitive);
                this._primitive.show = true;
            }
        } else {
            this._primitive.show = true;
        }
    };

    DynamicGeometryBatchItem.prototype.destroy = function() {
        this._primitives.remove(this._primitive);
    };

    return PolylineGeometryUpdater;
});