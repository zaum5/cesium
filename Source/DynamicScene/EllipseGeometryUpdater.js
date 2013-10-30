/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/GeometryInstance',
        '../Core/EllipseGeometry',
        '../Core/Iso8601',
        '../Core/EllipseOutlineGeometry',
        './ConstantProperty',
        './ConstantPositionProperty',
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
        defineProperties,
        DeveloperError,
        ShowGeometryInstanceAttribute,
        defaultValue,
        defined,
        GeometryInstance,
        EllipseGeometry,
        Iso8601,
        EllipseOutlineGeometry,
        ConstantProperty,
        ConstantPositionProperty,
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
        this.center = undefined;
        this.semiMajorAxis = undefined;
        this.semiMinorAxis = undefined;
        this.rotation = undefined;
        this.height = undefined;
        this.extrudedHeight = undefined;
        this.granularity = undefined;
        this.stRotation = undefined;
        this.numberOfVerticalLines= undefined;
        this.vertexFormat = undefined;
    };

    var EllipseGeometryUpdater = function(dynamicObject) {
        if (!defined(dynamicObject)) {
            throw new DeveloperError('dynamicObject is required.');
        }

        dynamicObject.propertyChanged.addEventListener(EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);

        this._id = dynamicObject.id;
        this._dynamicObject = dynamicObject;
        this._show = true;
        this._color = Color.clone(Color.WHITE);
        this._outline = true;
        this._outlineColor = Color.BLACK.clone();
        this._material = undefined;
        this._geometryType = GeometryBatchType.NONE;
        this._needEvaluation = true;
        this._ellipse = undefined;
        this._geometryOptions = new GeometryOptions(dynamicObject);

        this._dynamicPosition = false;
        this._positionProperty = undefined;

        this._dynamicSemiMajorAxis = false;
        this._semiMajorAxisProperty = undefined;

        this._dynamicSemiMinorAxis = false;
        this._semiMinorAxisProperty = undefined;

        this._dynamicRotation = false;
        this._semiRotationProperty = undefined;

        this._dynamicHeight = false;
        this._heightProperty = undefined;

        this._dynamicExtrudedHeight = false;
        this._extrudedHeightProperty = undefined;

        this._dynamicGranularity = false;
        this._granularityProperty = undefined;

        this._dynamicStRotation = false;
        this._stRotationProperty = undefined;

        this._dynamicShow = false;
        this._showProperty = undefined;

        this._dynamicMaterial = false;
        this._materialProperty = undefined;

        this._dynamicColor = false;
        this._colorProperty = undefined;

        this._dynamicOutline = false;
        this._outlineProperty = undefined;

        this._dynamicOutlineColor = false;
        this._outlineColorProperty = undefined;

        this._dynamicnumberOfVerticalLines = false;
        this._numberOfVerticalLinesProperty = undefined;
    };

    defineProperties(EllipseGeometryUpdater.prototype, {
        id : {
            get : function() {
                return this._id;
            }
        },
        geometryType : {
            get : function() {
                return this._geometryType;
            }
        },
        hasOutline : {
            get : function() {
                return this._outline;
            }
        },
        isTranslucent : {
            get : function() {
                return this._color.alpha !== 1.0;
            }
        },
        isOutlineTranslucent : {
            get : function() {
                return this._outlineColor.alpha !== 1.0;
            }
        }
    });

    EllipseGeometryUpdater.prototype.createGeometryInstance = function() {
        var attributes;
        if (this._geometryType === GeometryBatchType.COLOR) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this._show),
                color : ColorGeometryInstanceAttribute.fromColor(this._color)
            };
        } else if (this._geometryType === GeometryBatchType.MATERIAL) {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this._show)
            };
        } else {
            attributes = {
                show : new ShowGeometryInstanceAttribute(this._show),
                color : ColorGeometryInstanceAttribute.fromColor(this._color)
            };
        }

        return new GeometryInstance({
            id : this._dynamicObject,
            geometry : new EllipseGeometry(this._geometryOptions),
            attributes : attributes
        });
    };

    EllipseGeometryUpdater.prototype.createOutlineGeometryInstance = function() {
        var attributes = {
            show : new ShowGeometryInstanceAttribute(this._outline),
            color : ColorGeometryInstanceAttribute.fromColor(this._outlineColor)
        };

        return new GeometryInstance({
            id : this._dynamicObject,
            geometry : new EllipseOutlineGeometry(this._geometryOptions),
            attributes : attributes
        });
    };

    EllipseGeometryUpdater.prototype.updateAttributes = function(attributes) {
        var color = this._color;
        if (defined(color)) {
            attributes.color = ColorGeometryInstanceAttribute.toValue(color, attributes.color);
        }
        var show = this._show;
        if (defined(show)) {
            attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
        }
    };

    EllipseGeometryUpdater.prototype.updateOutlineAttributes = function(attributes) {
        var color = this._outlineColor;
        if (defined(color)) {
            attributes.color = ColorGeometryInstanceAttribute.toValue(color, attributes.color);
        }
        var show = this._outline;
        if (defined(show)) {
            attributes.show = ShowGeometryInstanceAttribute.toValue(show, attributes.show);
        }
    };

    EllipseGeometryUpdater.prototype.update = function(time) {
        if (this._needEvaluation) {
            this._evaluate();
        }

        var type = this._geometryType;
        if (type === GeometryBatchType.NONE) {
            return;
        }

        var show = (!this._dynamicShow || this._showProperty.getValue(time)) && this._dynamicObject.isAvailable(time);
        this._show = show;
        if (!show) {
            return;
        }

        if (type === GeometryBatchType.COLOR && this._dynamicColor) {
            this._color = defaultValue(this._colorProperty.getValue(time, this._color), this._color);
        } else if (type === GeometryBatchType.DYNAMIC) {
            var options = this._geometryOptions;
            if (this._dynamicPosition) {
                options.center = this._positionProperty.getValue(time);
            }

            if (this._dynamicSemiMajorAxis) {
                options.semiMajorAxis = this._semiMajorAxisProperty.getValue(time);
            }

            if (this._dynamicSemiMinorAxis) {
                options.semiMinorAxis = this._semiMinorAxisProperty.getValue(time);
            }

            if (this._dynamicRotation) {
                options.rotation = this._rotationProperty.getValue(time);
            }

            if (this._dynamicHeight) {
                options.height = this._heightProperty.getValue(time);
            }

            if (this._dynamicExtrudedHeight) {
                options.extrudedHeight = this._extrudedHeightProperty.getValue(time);
            }

            if (this._dynamicGranularity) {
                options.granularity = this._granularityProperty.getValue(time);
            }

            if (this._dynamicStRotation) {
                options.stRotation = this._stRotationProperty.getValue(time);
            }

            if (this._dynamicOutline) {
                this._outline = this._outlineProperty.getValue(time);
            }

            if (this._dynamicOutlineColor) {
                this._outlineColor = this._outlineColorProperty.getValue(time);
            }

            var materialProperty = this._materialProperty;
            if (defined(materialProperty)) {
                this._material = MaterialProperty.getValue(time, materialProperty, this._material);
            }
        }
    };

    EllipseGeometryUpdater.prototype._evaluate = function() {
        this._needEvaluation = false;

        var dynamicObject = this._dynamicObject;
        var ellipse = this._ellipse;

        if (ellipse !== dynamicObject._ellipse) {
            if (defined(ellipse)) {
                ellipse.propertyChanged.removeEventListener(EllipseGeometryUpdater.prototype._onEllipsePropertyChanged, this);
            }
            ellipse = dynamicObject._ellipse;
            if (defined(ellipse)) {
                ellipse.propertyChanged.addEventListener(EllipseGeometryUpdater.prototype._onEllipsePropertyChanged, this);
            }
        }

        if (!defined(ellipse)) {
            this._geometryType = GeometryBatchType.NONE;
            return;
        }

        var positionProperty = dynamicObject.position;
        var semiMajorAxisProperty = ellipse.semiMajorAxis;
        var semiMinorAxisProperty = ellipse.semiMinorAxis;

        if (!defined(positionProperty) || !defined(semiMajorAxisProperty) || !defined(semiMinorAxisProperty)) {
            this._geometryType = GeometryBatchType.NONE;
            return;
        }

        var isConstant;
        var options = this._geometryOptions;

        if (this._positionProperty !== positionProperty) {
            isConstant = positionProperty instanceof ConstantPositionProperty;
            if (isConstant) {
                options.center = positionProperty.getValue(Iso8601.MINIMUM_VALUE);
            }
            this._dynamicPosition = defined(positionProperty) && !isConstant;
            this._positionProperty = positionProperty;
        }

        if (this._semiMajorAxisProperty !== semiMajorAxisProperty) {
            isConstant = semiMajorAxisProperty instanceof ConstantProperty;
            if (isConstant) {
                options.semiMajorAxis = semiMajorAxisProperty.getValue();
            }
            this._dynamicSemiMajorAxis = defined(semiMajorAxisProperty) && !isConstant;
            this._semiMajorAxisProperty = semiMajorAxisProperty;
        }

        if (this._semiMinorAxisProperty !== semiMinorAxisProperty) {
            isConstant = semiMinorAxisProperty instanceof ConstantProperty;
            if (isConstant) {
                options.semiMinorAxis = semiMinorAxisProperty.getValue();
            }
            this._dynamicSemiMinorAxis = defined(semiMinorAxisProperty) && !isConstant;
            this._semiMinorAxisProperty = semiMinorAxisProperty;
        }

        var rotationProperty = ellipse.bearing;
        if (this._rotationProperty !== rotationProperty) {
            isConstant = rotationProperty instanceof ConstantProperty;
            if (isConstant) {
                if (!rotationProperty.getValue()) {
                    this._geometryType = GeometryBatchType.NONE;
                    return;
                }
            }
            this._dynamicShow = defined(rotationProperty) && !isConstant;
            this._rotationProperty = rotationProperty;
        }

        var showProperty = ellipse.show;
        if (this._showProperty !== showProperty) {
            isConstant = showProperty instanceof ConstantProperty;
            if (isConstant) {
                if (!showProperty.getValue()) {
                    this._geometryType = GeometryBatchType.NONE;
                    return;
                }
            }
            this._dynamicShow = defined(showProperty) && !isConstant;
            this._showProperty = showProperty;
        }

        var heightProperty = ellipse.height;
        if (this._heightProperty !== heightProperty) {
            isConstant = heightProperty instanceof ConstantProperty;
            if (isConstant) {
                options.height = heightProperty.getValue();
            }
            this._dynamicHeight = defined(heightProperty) && !isConstant;
            this._heightProperty = heightProperty;
        }

        var extrudedHeightProperty = ellipse.extrudedHeight;
        if (this._extrudedHeightProperty !== extrudedHeightProperty) {
            isConstant = extrudedHeightProperty instanceof ConstantProperty;
            if (isConstant) {
                options.extrudedHeight = extrudedHeightProperty.getValue();
            }
            this._dynamicExtrudedHeight = defined(extrudedHeightProperty) && !isConstant;
            this._extrudedHeightProperty = extrudedHeightProperty;
        }

        var stRotationProperty = ellipse.stRotation;
        if (this._stRotationProperty !== stRotationProperty) {
            isConstant = stRotationProperty instanceof ConstantProperty;
            if (isConstant) {
                options.stRotation = stRotationProperty.getValue();
            }
            this._dynamicStRotation = defined(stRotationProperty) && !isConstant;
            this._stRotationProperty = stRotationProperty;
        }

        var outlineProperty = ellipse.outline;
        if (this._outlineProperty !== outlineProperty) {
            isConstant = outlineProperty instanceof ConstantProperty;
            if (isConstant) {
                this._outline = outlineProperty.getValue();
            }
            this._dynamicOutline = defined(outlineProperty) && !isConstant;
            this._outlineProperty = outlineProperty;
        }

        var outlineColorProperty = ellipse.outlineColor;
        if (this._outlineColorProperty !== outlineColorProperty) {
            isConstant = outlineColorProperty instanceof ConstantProperty;
            if (isConstant) {
                this._outlineColor = outlineColorProperty.getValue();
            }
            this._dynamicOutlineColor = defined(outlineColorProperty) && !isConstant;
            this._outlineColorProperty = outlineColorProperty;
        }

        var granularityProperty = ellipse.granularity;
        if (this._granularityProperty !== granularityProperty) {
            isConstant = granularityProperty instanceof ConstantProperty;
            if (isConstant) {
                options.granularity = granularityProperty.getValue();
            }
            this._dynamicGranularity = defined(granularityProperty) && !isConstant;
            this._granularityProperty = granularityProperty;
        }

        var materialProperty = ellipse.material;
        var isColorMaterial = !defined(materialProperty) || materialProperty instanceof ColorMaterialProperty;
        if (isColorMaterial) {
            if (defined(materialProperty)) {
                var colorProperty = materialProperty.color;
                if (this._colorProperty !== colorProperty) {
                    isConstant = colorProperty instanceof ConstantProperty;
                    if (isConstant) {
                        this._color = colorProperty.getValue();
                    }
                    this._dynamicColor = defined(colorProperty) && !isConstant;
                    this._colorProperty = colorProperty;
                }
            } else {
                this._colorProperty = undefined;
                this._color = Color.WHITE.clone();
            }
        }
        this._materialProperty = materialProperty;

        var geometryType;
        if (this._dynamicPosition || this._dynamicGranularity || this._dynamicStRotation || this._dynamicHeight || this._dynamicExtrudedHeight) {
            geometryType = GeometryBatchType.DYNAMIC;
        } else if (!isColorMaterial) {
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.MATERIAL;
        } else {
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
            geometryType = GeometryBatchType.COLOR;
        }

        this._geometryType = geometryType;
        return geometryType;
    };

    EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this._needEvaluation = name === 'position' || name === 'ellipse';
    };

    EllipseGeometryUpdater.prototype._onEllipsePropertyChanged = function(ellipse, name, value, oldValue) {
        this._needEvaluation = true;
    };

    EllipseGeometryUpdater.prototype.destroy = function() {
        this._dynamicObject.propertyChanged.removeEventListener(EllipseGeometryUpdater.prototype._onDynamicObjectPropertyChanged, this);
        var ellipse = this._ellipse;
        if (defined(ellipse)) {
            ellipse.propertyChanged.removeEventListener(EllipseGeometryUpdater.prototype._onEllipsePropertyChanged, this);
        }
    };

    EllipseGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryBatchItem(primitives, this);
    };

    var DynamicGeometryBatchItem = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._geometryUpdater = geometryUpdater;
        this._center = undefined;
        this._semiMajorAxis = undefined;
        this._semiMinorAxis = undefined;
        this._rotation = undefined;
        this._material = undefined;
        this._granularity = undefined;
        this._height = undefined;
        this._extrudedHeight = undefined;
        this._stRotation = undefined;

        this._show = undefined;
        this._translucent = false;
        this._primitive = undefined;

        this._outline = undefined;
        this._outlineTranslucent = undefined;
        this._outlinePrimitive = undefined;
    };

    DynamicGeometryBatchItem.prototype.update = function() {
        var geometryUpdater = this._geometryUpdater;
        var options = geometryUpdater._geometryOptions;
        var center = options.center;
        var semiMajorAxis = options.semiMajorAxis;
        var semiMinorAxis = options._semiMinorAxis;

        var height = options.height;
        var extrudedHeight = options.extrudedHeight;
        var granularity = options.granularity;
        var stRotation = options.stRotation;
        var material = geometryUpdater.material;
        var rotation = options.rotation;

        var translucent = this._translucent;
        if (defined(material) && defined(material.uniforms.color)) {
            translucent = material.uniforms.color.alpha !== 1.0;
        }

        if (true || this._granularity !== granularity || //
            this._height !== height || //
            this._extrudedHeight !== extrudedHeight || //
            this._stRotation !== stRotation || //
            this._center !== center || //
            this._semiMajorAxis !== semiMajorAxis || //
            this._semiMinorAxis !== semiMinorAxis || //
            this._rotation !== rotation) {

            this._translucent = translucent;
            this._granularity = granularity;
            this._height = height;
            this._extrudedHeight = extrudedHeight;
            this._stRotation = stRotation;
            this._material = material;
            this._center = center;
            this._semiMajorAxis = semiMajorAxis;
            this._semiMinorAxis = semiMinorAxis;
            this._rotation = rotation;

            var appearance;

            if (true ||!defined(this._primitive) || this._translucent !== translucent) {
                this._primitives.remove(this._primitive);
                this._primitive = undefined;

                appearance = new MaterialAppearance({
                    material : material,
                    translucent : translucent,
                    closed : true
                });
                geometryUpdater._geometryOptions.vertexFormat = appearance.vertexFormat;
                this._primitive = new Primitive({
                    geometryInstances : geometryUpdater.createGeometryInstance(),
                    appearance : appearance,
                    asynchronous : false
                });
                this._primitives.add(this._primitive);
            }

            if (true ||!defined(this._outlinePrimitive) || this._translucent !== translucent) {
                this._primitives.remove(this._outlinePrimitive);
                this._outlinePrimitive = undefined;

                appearance = new PerInstanceColorAppearance({
                    flat : true,
                    translucent : this.translucent,
                    renderState : {
                        depthTest : {
                            enabled : true
                        }
                    //,
                    //lineWidth : Math.min(3.0, scene.getContext().getMaximumAliasedLineWidth())
                    }
                });

                geometryUpdater._geometryOptions.vertexFormat = appearance.vertexFormat;
                this._outlinePrimitive = new Primitive({
                    geometryInstances : geometryUpdater.createOutlineGeometryInstance(),
                    appearance : appearance,
                    asynchronous : false
                });
                this._primitives.add(this._outlinePrimitive);
            }
        }
        this._primitive.show = true;
    };

    DynamicGeometryBatchItem.prototype.destroy = function() {
        this._primitives.remove(this._primitive);
        this._primitives.remove(this._outlinePrimitive);
    };

    return EllipseGeometryUpdater;
});
