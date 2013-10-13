/*global define*/
define(['../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Dictionary',
        '../Core/GeometryInstance',
        '../Core/PolygonGeometry',
        './ConstantProperty',
        './ColorMaterialProperty',
        './DynamicGeometryBatch',
        './DynamicObjectCollection',
        './StaticGeometryColorBatch',
        './StaticGeometryPerMaterialBatch',
        '../Scene/Primitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Material',
        './MaterialProperty'
    ], function(
        Color,
        defaultValue,
        defined,
        DeveloperError,
        destroyObject,
        Dictionary,
        GeometryInstance,
        PolygonGeometry,
        ConstantProperty,
        ColorMaterialProperty,
        DynamicGeometryBatch,
        DynamicObjectCollection,
        StaticGeometryColorBatch,
        StaticGeometryPerMaterialBatch,
        Primitive,
        MaterialAppearance,
        PerInstanceColorAppearance,
        Material,
        MaterialProperty) {
    "use strict";

    var emptyArray = [];

    var GeometryType = {
        PER_INSTANCE : 0,
        PER_MATERIAL : 1,
        DYNAMIC : 2,
        NONE : 3
    };

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
        dynamicObject.propertyChanged.addEventListener(PolygonGeometryUpdater.onDynamicObjectPropertyChanged, this);

        this.id = dynamicObject.id;
        this.dynamicObject = dynamicObject;
        this.show = true;
        this.color = Color.WHITE.clone();
        this.materialProperty = undefined;
        this.material = Material.fromType('Color');
        this.geometryType = GeometryType.NONE;

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

    PolygonGeometryUpdater.prototype.createGeometry = function() {
        return PolygonGeometry.fromPositions(this._geometryOptions);
    };

    PolygonGeometryUpdater.prototype.update = function(time) {
        if (this._needEvaluation) {
            this.evaluate();
        }

        var type = this.geometryType;
        if (type === GeometryType.NONE) {
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

        if (type === GeometryType.PER_INSTANCE) {
            var colorProperty = this._colorProperty;
            if (defined(colorProperty)) {
                this.color = defaultValue(colorProperty.getValue(time, this.color), this.color);
            }
        } else if (type === GeometryType.DYNAMIC) {
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
                polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.onPolygonPropertyChanged, this);
            }
            polygon = dynamicObject._polygon;
            if (defined(polygon)) {
                polygon.propertyChanged.addEventListener(PolygonGeometryUpdater.onPolygonPropertyChanged, this);
            }
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (!defined(polygon) || !defined(vertexPositionsProperty)) {
            this.geometryType = GeometryType.NONE;
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
        } else {
            this._showProperty = showProperty;
        }

        var heightProperty = polygon.height;
        if (defined(heightProperty) && heightProperty instanceof ConstantProperty) {
            this._heightProperty = undefined;
            options.height = heightProperty.getValue();
        } else {
            this._heightProperty = heightProperty;
        }

        var extrudedHeightProperty = polygon.extrudedHeight;
        if (defined(extrudedHeightProperty) && extrudedHeightProperty instanceof ConstantProperty) {
            this._extrudedHeightProperty = undefined;
            options.extrudedHeight = extrudedHeightProperty.getValue();
        } else {
            this._extrudedHeightProperty = extrudedHeightProperty;
        }

        var stRotationProperty = polygon.stRotation;
        if (defined(stRotationProperty) && stRotationProperty instanceof ConstantProperty) {
            this._stRotationProperty = undefined;
            options.stRotation = stRotationProperty.getValue();
        } else {
            this._stRotationProperty = stRotationProperty;
        }

        var granularityProperty = polygon.granularity;
        if (defined(granularityProperty) && granularityProperty instanceof ConstantProperty) {
            this._granularityProperty = undefined;
            options.granularity = granularityProperty.getValue();
        } else {
            this._granularityProperty = granularityProperty;
        }

        var material = polygon.material;
        var isColorMaterial = material instanceof ColorMaterialProperty;
        if (isColorMaterial) {
            var colorProperty = material.color;
            if (defined(colorProperty) && colorProperty instanceof ConstantProperty) {
                this._colorProperty = undefined;
                this.color = colorProperty.getValue(undefined, this.color);
            } else {
                this._colorProperty = colorProperty;
            }
        }
        this.materialProperty = material;

        if (defined(this._vertexPositionsProperty) || defined(this._granularityProperty) || defined(this._stRotationProperty) || defined(this._heightProperty) || defined(this._extrudedHeightProperty)) {
            this.geometryType = GeometryType.DYNAMIC;
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
        } else if (!isColorMaterial) {
            this.geometryType = GeometryType.PER_MATERIAL;
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
        } else {
            this.geometryType = GeometryType.PER_INSTANCE;
            options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
        }
    };

    PolygonGeometryUpdater.onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this._needEvaluation = name === 'vertexPositions' || name === 'polygon';
    };

    PolygonGeometryUpdater.onPolygonPropertyChanged = function(polygon, name, value, oldValue) {
        this._needEvaluation = true;
    };

    PolygonGeometryUpdater.destroy = function() {
        this.dynamicObject.propertyChanged.removeEventListener(PolygonGeometryUpdater.onDynamicObjectPropertyChanged, this);
        var polygon = this._polygon;
        if (defined(polygon)) {
            polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.onPolygonPropertyChanged, this);
        }
    };

    PolygonGeometryUpdater.createDynamicUpdater = function(primitives){
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
                geometryInstances : new GeometryInstance({
                    geometry : PolygonGeometry.fromPositions(options),
                    id : this.id,
                    pickPrimitive : this
                }),
                appearance : new MaterialAppearance({
                    material : material,
                    faceForward : true,
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

    /**
     * A DynamicObject visualizer which maps the DynamicPolygon instance
     * in DynamicObject.polygon to a Polygon primitive.
     * @alias DynamicPolygonVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the primitives will be rendered in.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     *
     * @see DynamicPolygon
     * @see Scene
     * @see DynamicObject
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection
     * @see DynamicBillboardVisualizer
     * @see DynamicConeVisualizer
     * @see DynamicConeVisualizerUsingCustomSensorr
     * @see DynamicLabelVisualizer
     * @see DynamicPointVisualizer
     * @see DynamicPolylineVisualizer
     * @see DynamicPyramidVisualizer
     */
    var DynamicPolygonVisualizer = function(scene, dynamicObjectCollection) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        this._scene = scene;
        this._primitives = scene.getPrimitives();
        this._dynamicObjectCollection = undefined;
        this._addedObjects = new DynamicObjectCollection();
        this._removedObjects = new DynamicObjectCollection();

        this._batches = [];
        this._batches[GeometryType.PER_INSTANCE] = new StaticGeometryColorBatch(scene, true);
        this._batches[GeometryType.DYNAMIC] = new DynamicGeometryBatch(scene);
        this._batches[GeometryType.PER_MATERIAL] = new StaticGeometryPerMaterialBatch(scene);

        this._updaters = new Dictionary();
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    DynamicPolygonVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    DynamicPolygonVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    DynamicPolygonVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            if (defined(oldCollection)) {
                oldCollection.collectionChanged.removeEventListener(DynamicPolygonVisualizer.prototype.onCollectionChanged, this);
                this.removeAllPrimitives();
            }
            this._dynamicObjectCollection = dynamicObjectCollection;
            if (defined(dynamicObjectCollection)) {
                dynamicObjectCollection.collectionChanged.addEventListener(DynamicPolygonVisualizer.prototype.onCollectionChanged, this);
                //Add all existing items to the collection.
                this.onCollectionChanged(dynamicObjectCollection, dynamicObjectCollection.getObjects(), emptyArray);
            }
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    DynamicPolygonVisualizer.prototype.update = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }

        var polygon;

        var addedObjects = this._addedObjects;
        var added = addedObjects.getObjects();
        var removedObjects = this._removedObjects;
        var removed = removedObjects.getObjects();

        var i;
        var g;
        var dynamicObject;
        var id;
        var updater;
        var batch;
        var batches = this._batches;
        for (i = removed.length - 1; i > -1; i--) {
            dynamicObject = removed[i];
            id = dynamicObject.id;
            updater = this._updaters.getValue(id);
            batch = batches[updater.geometryType];
            if (defined(batch)) {
                batch.remove(updater);
            }
            updater.destroy();
            this._updaters.remove(id);
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            id = dynamicObject.id;
            updater = this._updaters.add(id, new PolygonGeometryUpdater(dynamicObject));
        }

        addedObjects.removeAll();
        removedObjects.removeAll();

        var updaters = this._updaters.getValues();

        for (g = 0; g < updaters.length; g++) {
            updater = updaters[g];
            var oldType = updater.geometryType;
            updater.update(time);
            var newType = updater.geometryType;
            if (oldType !== newType) {
                batch = batches[oldType];
                if (defined(batch)) {
                    batch.remove(updater);
                }
                batch = batches[newType];
                if (defined(batch)) {
                    batch.add(updater);
                }
            }
        }
        for (g = 0; g < batches.length; g++) {
            batches[g].update(time);
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    DynamicPolygonVisualizer.prototype.removeAllPrimitives = function() {
        this._addedObjects.removeAll();
        this._removedObjects.removeAll();

        var batches = this._batches;
        var batchesLength = batches.length;
        for (var g = 0; g < batchesLength; g++) {
            batches[g].removeAllPrimitives();
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof DynamicPolygonVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see DynamicPolygonVisualizer#destroy
     */
    DynamicPolygonVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof DynamicPolygonVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see DynamicPolygonVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    DynamicPolygonVisualizer.prototype.destroy = function() {
        this.removeAllPrimitives();
        return destroyObject(this);
    };

    DynamicPolygonVisualizer.prototype.onCollectionChanged = function(dynamicObjectCollection, added, removed) {
        var addedObjects = this._addedObjects;
        var removedObjects = this._removedObjects;

        var i;
        var dynamicObject;
        for (i = removed.length - 1; i > -1; i--) {
            dynamicObject = removed[i];
            if (!addedObjects.remove(dynamicObject)) {
                removedObjects.add(dynamicObject);
            }
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            if (!removedObjects.remove(dynamicObject)) {
                addedObjects.add(dynamicObject);
            }
        }
    };

    return DynamicPolygonVisualizer;
});
