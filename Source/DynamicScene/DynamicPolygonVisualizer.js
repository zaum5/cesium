/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/GeometryInstance',
        '../Core/PolygonGeometry',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ShowGeometryInstanceAttribute',
        './ConstantProperty',
        './ColorMaterialProperty',
        './DynamicObjectCollection',
        '../Scene/Primitive',
        '../Scene/MaterialAppearance',
        '../Scene/PerInstanceColorAppearance',
        '../Scene/Material',
        './MaterialProperty'
       ], function(
         Cartesian3,
         Color,
         defaultValue,
         defined,
         DeveloperError,
         destroyObject,
         GeometryInstance,
         PolygonGeometry,
         ColorGeometryInstanceAttribute,
         ShowGeometryInstanceAttribute,
         ConstantProperty,
         ColorMaterialProperty,
         DynamicObjectCollection,
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

    var GeometryHashSet = function() {
        this._array = [];
        this._hash = {};
    };

    GeometryHashSet.prototype.getArray = function() {
        return this._array;
    };

    GeometryHashSet.prototype.add = function(id, value) {
        this._hash[id] = value;
        this._array.push(value);
    };

    GeometryHashSet.prototype.getById = function(id) {
        return this._hash[id];
    };

    GeometryHashSet.prototype.removeById = function(id) {
        var hasValue = defined(this._hash[id]);
        if (hasValue) {
            var array = this._array;
            array.splice(array.indexOf(this._hash[id]), 1);
            this._hash[id] = undefined;
        }
        return hasValue;
    };

    GeometryHashSet.prototype.removeAll = function() {
        this._hash = {};
        this._array.length = 0;
    };

    var PolygonGeometryUpdater = function(dynamicObject) {
        dynamicObject.propertyChanged.addEventListener(PolygonGeometryUpdater.onDynamicObjectPropertyChanged, this);

        this.id = dynamicObject.id;
        this.dynamicObject = dynamicObject;
        this.polygon = undefined;
        this.vertexPositionsProperty = undefined;
        this.showProperty = undefined;
        this.granularityProperty = undefined;
        this.stRotationProperty = undefined;
        this.heightProperty = undefined;
        this.extrudedHeightProperty = undefined;
        this.materialProperty = undefined;
        this.colorProperty = undefined;

        this.geometryType = GeometryType.NONE;
        this.color = Color.WHITE.clone();
        this.material = undefined;
        this.show = true;
        this.needEvaluation = true;
        this.geometryOptions = new GeometryOptions(dynamicObject);
    };

    PolygonGeometryUpdater.prototype.update = function(time) {
        if (this.needEvaluation) {
            this.evaluate();
        }

        var type = this.geometryType;
        if (type === GeometryType.NONE) {
            return;
        }

        var show = this.show;
        var showProperty = this.showProperty;
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
            var colorProperty = this.colorProperty;
            if (defined(colorProperty)) {
                this.color = defaultValue(colorProperty.getValue(time, this.color), this.color);
            }
        } else if (type === GeometryType.DYNAMIC || type === GeometryType.PER_MATERIAL) {
            var options = this.geometryOptions;
            var vertexPositionsProperty = this.vertexPositionsProperty;
            if (defined(vertexPositionsProperty)) {
                options.positions = vertexPositionsProperty.getValue(time);
            }

            var granularityProperty = this.granularityProperty;
            if (defined(granularityProperty)) {
                options.granularity = granularityProperty.getValue(time);
            }

            var stRotationProperty = this.stRotationProperty;
            if (defined(stRotationProperty)) {
                options.stRotation = stRotationProperty.getValue(time);
            }

            var heightProperty = this.heightProperty;
            if (defined(heightProperty)) {
                options.height = heightProperty.getValue(time);
            }

            var extrudedHeightProperty = this.extrudedHeightProperty;
            if (defined(extrudedHeightProperty)) {
                options.extrudedHeight = extrudedHeightProperty.getValue(time);
            }

           // if (type === GeometryType.DYNAMIC) {
                var materialProperty = this.materialProperty;
                if (defined(materialProperty)) {
                    this.material = MaterialProperty.getValue(time, materialProperty, this.material);
                }
          //  }
        }
    };

    PolygonGeometryUpdater.prototype.evaluate = function() {
        this.needEvaluation = false;

        var dynamicObject = this.dynamicObject;
        var polygon = this.polygon;

        if (polygon !== dynamicObject.polygon) {
            if (defined(polygon)) {
                polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.onPolygonPropertyChanged, this);
            }
            polygon = dynamicObject.polygon;
            if (defined(polygon)) {
                polygon.propertyChanged.addEventListener(PolygonGeometryUpdater.onPolygonPropertyChanged, this);
            }
        }

        var vertexPositionsProperty = dynamicObject.vertexPositions;
        if (!defined(polygon) || !defined(vertexPositionsProperty)) {
            this.geometryType = GeometryType.NONE;
            return;
        }

        var options = this.geometryOptions;
        if (vertexPositionsProperty instanceof ConstantProperty) {
            this.vertexPositionsProperty = undefined;
            options.positions = vertexPositionsProperty.getValue();
        } else {
            this.vertexPositionsProperty = vertexPositionsProperty;
        }

        var showProperty = polygon.show;
        if (defined(showProperty) && showProperty instanceof ConstantProperty) {
            this.showProperty = undefined;
            this.show = showProperty.getValue();
        } else {
            this.showProperty = showProperty;
        }

        var heightProperty = polygon.height;
        if (defined(heightProperty) && heightProperty instanceof ConstantProperty) {
            this.heightProperty = undefined;
            options.height = heightProperty.getValue();
        } else {
            this.heightProperty = heightProperty;
        }

        var extrudedHeightProperty = polygon.extrudedHeight;
        if (defined(extrudedHeightProperty) && extrudedHeightProperty instanceof ConstantProperty) {
            this.extrudedHeightProperty = undefined;
            options.extrudedHeight = extrudedHeightProperty.getValue();
        } else {
            this.extrudedHeightProperty = extrudedHeightProperty;
        }

        var stRotationProperty = polygon.stRotation;
        if (defined(stRotationProperty) && stRotationProperty instanceof ConstantProperty) {
            this.stRotationProperty = undefined;
            options.stRotation = stRotationProperty.getValue();
        } else {
            this.stRotationProperty = stRotationProperty;
        }

        var granularityProperty = polygon.granularity;
        if (defined(granularityProperty) && granularityProperty instanceof ConstantProperty) {
            this.granularityProperty = undefined;
            options.granularity = granularityProperty.getValue();
        } else {
            this.granularityProperty = granularityProperty;
        }

        var material = polygon.material;
        if (defined(material) && (material instanceof ColorMaterialProperty)) {
            var colorProperty = material.color;
            if (defined(colorProperty) && colorProperty instanceof ConstantProperty) {
                this.colorProperty = undefined;
                this.color = colorProperty.getValue(undefined, this.color);
            } else {
                this.colorProperty = colorProperty;
            }
        }
        this.materialProperty = material;

        if (defined(this.vertexPositionsProperty)) {
            this.geometryType = GeometryType.DYNAMIC;
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
            return;
        }
        if (defined(this.granularityProperty) || defined(this.stRotationProperty) || defined(this.heightProperty) || defined(this.extrudedHeightProperty)) {
            this.geometryType = GeometryType.PER_MATERIAL;
            options.vertexFormat = MaterialAppearance.VERTEX_FORMAT;
            return;
        }

        this.geometryType = GeometryType.PER_INSTANCE;
        options.vertexFormat = PerInstanceColorAppearance.VERTEX_FORMAT;
    };

    PolygonGeometryUpdater.onDynamicObjectPropertyChanged = function(dyamicObject, name, value, oldValue) {
        this.needEvaluation = name === 'vertexPositions' || name === 'polygon';
    };

    PolygonGeometryUpdater.onPolygonPropertyChanged = function(polygon, name, value, oldValue) {
        this.needEvaluation = true;
    };

    PolygonGeometryUpdater.destroy = function() {
        this.dynamicObject.propertyChanged.removeEventListener(PolygonGeometryUpdater.onDynamicObjectPropertyChanged, this);
        var polygon = this.polygon;
        if (defined(polygon)) {
            polygon.propertyChanged.removeEventListener(PolygonGeometryUpdater.onPolygonPropertyChanged, this);
        }
    };

    var PerInstaceColorBatch = function(scene, translucent) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }

        this._scene = scene;
        this._primitives = scene.getPrimitives();
        this._geometry = new GeometryHashSet();
        this._updaters = new GeometryHashSet();
        this._primitive = undefined;
        this._createPrimitive = false;
        this._translucent = translucent;
    };

    PerInstaceColorBatch.prototype.add = function(updater) {
        var instance = new GeometryInstance({
            id : updater.dynamicObject,
            geometry : PolygonGeometry.fromPositions(updater.geometryOptions),
            attributes : {
                show : new ShowGeometryInstanceAttribute(updater.show),
                color : ColorGeometryInstanceAttribute.fromColor(updater.color)
            }
        });
        this._geometry.add(updater.id, instance);
        this._updaters.add(updater.id, updater);
        this._createPrimitive = true;
    };

    PerInstaceColorBatch.prototype.remove = function(updater) {
        this._createPrimitive = this._geometry.removeById(updater.id) || this._createPrimitive;
        this._updaters.removeById(updater.id);
    };

    PerInstaceColorBatch.prototype.update = function() {
        var primitive = this._primitive;
        var primitives = this._primitives;
        var geometries = this._geometry.getArray();
        if (this._createPrimitive) {
            if (defined(primitive)) {
                primitives.remove(primitive);
            }
            if (geometries.length > 0) {
                primitive = new Primitive({
                    asynchronous : false,
                    geometryInstances : geometries,
                    appearance : new PerInstanceColorAppearance({
                        translucent : this._translucent
                    })
                });

                primitives.add(primitive);
            }
            this._primitive = primitive;
            this._createPrimitive = false;
        } else {
            var updaters = this._updaters.getArray();
            for (var i = geometries.length - 1; i > -1; i--) {
                var instance = geometries[i];
                var updater = updaters[i];

                var attributes = instance.dynamicAttributes;
                if (!defined(attributes)) {
                    attributes = primitive.getGeometryInstanceAttributes(instance.id);
                    instance.dynamicAttributes = attributes;
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

    PerInstaceColorBatch.prototype.removeAllPrimitives = function() {
        if (defined(this._primitive)) {
            var primitives = this._primitives;
            primitives.remove(this._primitive);
            this._primitive = undefined;
            this._geometry.removeAll();
            this._updaters.removeAll();
        }
    };

    var DynamicBatch = function(scene) {
        this._scene = scene;
        this._primitives = scene.getPrimitives();
        this._items = new GeometryHashSet();
    };

    DynamicBatch.prototype.add = function(updater) {
        this._items.add(updater.id, new DynamicBatchItem(this._primitives, updater));
    };

    DynamicBatch.prototype.remove = function(updater) {
        var id = updater.id;
        var primitive = this._items.getById(id);
        primitive.destroy();
        this._items.removeById(id);
    };

    DynamicBatch.prototype.update = function() {
        var geometries = this._items.getArray();
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].update();
        }
    };

    DynamicBatch.prototype.removeAllPrimitives = function() {
        var geometries = this._items.getArray();
        for (var i = 0, len = geometries.length; i < len; i++) {
            geometries[i].destroy();
        }
    };

    var DynamicBatchItem = function(primitives, geometryUpdater) {
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

    DynamicBatchItem.prototype.update = function() {
        var geometryUpdater = this._geometryUpdater;
        var options = geometryUpdater.geometryOptions;
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

    DynamicBatchItem.prototype.destroy = function() {
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
        this._batches[GeometryType.PER_INSTANCE] = new PerInstaceColorBatch(scene, true);
        this._batches[GeometryType.PER_MATERIAL] = new DynamicBatch(scene);
        this._batches[GeometryType.DYNAMIC] = new DynamicBatch(scene);

        this._updaters = new GeometryHashSet();
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
            updater = this._updaters.getById(id);
            batch = batches[updater.geometryType];
            if (defined(batch)) {
                batch.remove(updater);
            }
            updater.destroy();
            this._updaters.removeById(id);
        }

        for (i = added.length - 1; i > -1; i--) {
            dynamicObject = added[i];
            id = dynamicObject.id;
            updater = this._updaters.add(id, new PolygonGeometryUpdater(dynamicObject));
        }

        addedObjects.removeAll();
        removedObjects.removeAll();

        var updaters = this._updaters.getArray();

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

    DynamicPolygonVisualizer._onPropertyChanged = function(dyamicObject, name, value, oldValue) {
    };

    DynamicPolygonVisualizer._onPolygonPropertyChanged = function(polygon, name, value, oldValue) {
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
