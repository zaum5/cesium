/*global define*/
define(['../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/GeometryInstance',
        '../Core/EllipsoidGeometry',
        '../Core/Iso8601',
        '../Core/Matrix3',
        '../Core/Matrix4',
        './ConstantProperty',
        './ConstantPositionProperty',
        './ColorMaterialProperty',
        './GeometryBatchType',
        '../Scene/Primitive',
        '../Scene/MaterialAppearance',
        '../Scene/EllipsoidSurfaceAppearance',
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
        EllipsoidGeometry,
        Iso8601,
        Matrix3,
        Matrix4,
        ConstantProperty,
        ConstantPositionProperty,
        ColorMaterialProperty,
        GeometryBatchType,
        Primitive,
        MaterialAppearance,
        EllipsoidSurfaceAppearance,
        PerInstanceColorAppearance,
        Material,
        MaterialProperty) {
    "use strict";

    var GeometryOptions = function(dynamicObject) {
        this.id = dynamicObject;
        this.radii = undefined;
        this.vertexFormat = undefined;
    };

    var EllipsoidGeometryUpdater = function(dynamicObject) {
        dynamicObject.propertyChanged.addEventListener(EllipsoidGeometryUpdater.prototype.onDynamicObjectPropertyChanged, this);

        this.id = dynamicObject.id;
        this.dynamicObject = dynamicObject;
        this.show = true;
        this.color = Color.WHITE.clone();
        this.position = undefined;
        this.orientation = undefined;
        this._materialProperty = undefined;
        this.material = Material.fromType('Color');
        this.geometryType = GeometryBatchType.NONE;

        this._ellipsoid = undefined;
        this._radiiProperty = undefined;
        this._showProperty = undefined;
        this._colorProperty = undefined;
        this._positionProperty = undefined;
        this._orientationProperty = undefined;
        this._needEvaluation = true;
        this._geometryOptions = new GeometryOptions(dynamicObject);
    };

    EllipsoidGeometryUpdater.prototype.createGeometryInstance = function() {
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
            geometry : new EllipsoidGeometry(this._geometryOptions),
            attributes : attributes,
            modelMatrix : Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(this.orientation), this.position)
        });
    };

    EllipsoidGeometryUpdater.prototype.update = function(time) {
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
            var radiiProperty = this._radiiProperty;
            if (defined(radiiProperty)) {
                options.radii = radiiProperty.getValue(time);
            }

            var positionProperty = this._positionProperty;
            if (defined(positionProperty)) {
                this.position = positionProperty.getValue(time);
            }

            var orientationProperty = this._orientationProperty;
            if (defined(orientationProperty)) {
                this.orientation = orientationProperty.getValue(time);
            }

            var materialProperty = this._materialProperty;
            if (defined(materialProperty)) {
                this.material = MaterialProperty.getValue(time, materialProperty, this.material);
            }
        }
    };

    EllipsoidGeometryUpdater.prototype.evaluate = function() {
        this._needEvaluation = false;

        var dynamicObject = this.dynamicObject;
        var ellipsoid = this._ellipsoid;

        if (ellipsoid !== dynamicObject._ellipsoid) {
            if (defined(ellipsoid)) {
                ellipsoid.propertyChanged.removeEventListener(EllipsoidGeometryUpdater.prototype.onEllipsoidPropertyChanged, this);
            }
            ellipsoid = dynamicObject._ellipsoid;
            if (defined(ellipsoid)) {
                ellipsoid.propertyChanged.addEventListener(EllipsoidGeometryUpdater.prototype.onEllipsoidPropertyChanged, this);
            }
        }

        var positionProperty = dynamicObject.position;
        var orientationProperty = dynamicObject.orientation;

        if (!defined(ellipsoid) || !defined(positionProperty) || !defined(orientationProperty) || !defined(ellipsoid.radii)) {
            this.geometryType = GeometryBatchType.NONE;
            return;
        }

        if (positionProperty instanceof ConstantPositionProperty) {
            this._positionProperty = undefined;
            this.position = positionProperty.getValue(Iso8601.MINIMUM_VALUE);
        } else {
            this._positionProperty = positionProperty;
        }

        if (orientationProperty instanceof ConstantProperty) {
            this._orientationProperty = undefined;
            this.orientation = orientationProperty.getValue(Iso8601.MINIMUM_VALUE);
        } else {
            this._orientationProperty = orientationProperty;
        }

        var options = this._geometryOptions;
        var radiiProperty = ellipsoid.radii;
        if (radiiProperty instanceof ConstantProperty) {
            this._radiiProperty = undefined;
            options.radii = radiiProperty.getValue(Iso8601.MINIMUM_VALUE);
        } else {
            this._radiiProperty = radiiProperty;
        }

        var showProperty = ellipsoid.show;
        if (defined(showProperty) && showProperty instanceof ConstantProperty) {
            this._showProperty = undefined;
            this.show = showProperty.getValue(Iso8601.MINIMUM_VALUE);
            if (!this.show) {
                this.geometryType = GeometryBatchType.NONE;
                return;
            }
        } else {
            this._showProperty = showProperty;
        }

        var material = ellipsoid.material;
        var isColorMaterial = !defined(material) || material instanceof ColorMaterialProperty;
        if (isColorMaterial) {
            if (defined(material)) {
                var colorProperty = material.color;
                if (defined(colorProperty) && colorProperty instanceof ConstantProperty) {
                    this._colorProperty = undefined;
                    this.color = colorProperty.getValue(Iso8601.MINIMUM_VALUE, this.color);
                } else {
                    this._colorProperty = colorProperty;
                }
            } else {
                this._colorProperty = undefined;
                this.color = Color.WHITE.clone();
            }
        }
        this._materialProperty = material;

        if (defined(this._radiiProperty)) {
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

    EllipsoidGeometryUpdater.prototype.onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this._needEvaluation = name === 'position' || name === 'ellipsoid' || name === 'orientation';
    };

    EllipsoidGeometryUpdater.prototype.onEllipsoidPropertyChanged = function(ellipsoid, name, value, oldValue) {
        this._needEvaluation = true;
    };

    EllipsoidGeometryUpdater.prototype.destroy = function() {
        this.dynamicObject.propertyChanged.removeEventListener(EllipsoidGeometryUpdater.prototype.onDynamicObjectPropertyChanged, this);
        var ellipsoid = this._ellipsoid;
        if (defined(ellipsoid)) {
            ellipsoid.propertyChanged.removeEventListener(EllipsoidGeometryUpdater.prototype.onEllipsoidPropertyChanged, this);
        }
    };

    EllipsoidGeometryUpdater.prototype.createDynamicUpdater = function(primitives) {
        return new DynamicGeometryBatchItem(primitives, this);
    };

    var DynamicGeometryBatchItem = function(primitives, geometryUpdater) {
        this._primitives = primitives;
        this._geometryUpdater = geometryUpdater;
        this._material = undefined;
        this._show = undefined;
        this._radii = undefined;
        this._position = undefined;
        this._orientation = undefined;
        this._primitive = undefined;
        this._translucent = false;
    };

    DynamicGeometryBatchItem.prototype.update = function() {
        var geometryUpdater = this._geometryUpdater;
        var options = geometryUpdater._geometryOptions;
        var radii = options.radii;
        var position = geometryUpdater.position;
        var orientation = geometryUpdater.orientation;

        var show = geometryUpdater.show;
        if (!show || !defined(radii)) {
            if (defined(this._primitive)) {
                this._primitive.show = false;
            }
            return;
        }

        var material = geometryUpdater.material;

        var translucent = this._translucent;
        if (defined(material) && defined(material.uniforms.color)) {
            translucent = material.uniforms.color.alpha !== 1.0;
        }

        if (!defined(this._primitive) || this._translucent !== translucent || //
            this._radii !== radii || this._position !== position || this._orientation !== orientation) {

            this._translucent = translucent;
            this._material = material;
            this._radii = radii;
            this._position = position;
            this._orientation = orientation;

            this._primitives.remove(this._primitive);
            this._primitive = undefined;

            this._primitive = new Primitive({
                geometryInstances : geometryUpdater.createGeometryInstance(),
                appearance : new EllipsoidSurfaceAppearance({
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

    return EllipsoidGeometryUpdater;
});
