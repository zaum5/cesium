/*global define*/
define([
        '../Core/Matrix4',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './SceneMode',
        '../ThirdParty/webgl_tf_loader'
    ], function(
        Matrix4,
        CommandLists,
        DrawCommand,
        SceneMode,
        // MODELS_TODO: Make webgl_tf_loader.js work with AMD
        WebGLTFLoader) {
    "use strict";

    var ModelLoader = Object.create(WebGLTFLoader, {
        handleBuffer: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleShader: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleTechnique: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleMaterial: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleLight: {
            value: function(entryID, description, userInfo) {
                // MODELS_TODO: Support light
                return true;
            }
        },

        handleMesh: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleCamera: {
            value: function(entryID, description, userInfo) {
                // MODELS_TODO: Support camera
                return true;
            }
        },

        handleScene: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        },

        handleNode: {
            value: function(entryID, description, userInfo) {
                console.log(entryID);
                return true;
            }
        }
    });

    /**
     * DOC_TBA
     *
     * @alias Model
     * @constructor
     */
    var Model = function(url) {
        debugger;

        if (typeof url !== 'undefined') {
            var modelLoader = Object.create(ModelLoader);
            modelLoader.initWithPath(url);
            modelLoader.load(this);
        }

        /**
         * The 4x4 transformation matrix that transforms the model from model to world coordinates.
         * When this is the identity matrix, the model is drawn in world coordinates, i.e., Earth's WGS84 coordinates.
         * Local reference frames can be used by providing a different transformation matrix, like that returned
         * by {@link Transforms.eastNorthUpToFixedFrame}.  This matrix is available to GLSL vertex and fragment
         * shaders via {@link czm_model} and derived uniforms.
         * <p>
         * The default is {@link Matrix4.IDENTITY}.
         * </p>
         *
         * @type Matrix4
         *
         * @example
         * var origin = ellipsoid.cartographicToCartesian(
         *   Cartographic.fromDegrees(-95.0, 40.0, 200000.0));
         * m.modelMatrix = Transforms.eastNorthUpToFixedFrame(origin);
         *
         * @see Transforms.eastNorthUpToFixedFrame
         * @see czm_model
         */
        this.modelMatrix = Matrix4.IDENTITY.clone();
        this._computedModelMatrix = Matrix4.IDENTITY.clone();

        /**
         * Determines if the model primitive will be shown.
         * <p>
         * The default is <code>true</code>.
         * </p>
         *
         * @type Boolean
         */
        this.show = true;

        // new DrawCommand();
        this._colorCommands = [];
        this._commandLists = new CommandLists();
    };

    /**
     * @private
     *
     * @exception {DeveloperError} this.material must be defined.
     */
    Model.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        var modelCommandLists = this._commandLists;
        modelCommandLists.removeAll();

        if (frameState.passes.color) {
            modelCommandLists.colorList = this._colorCommands;
        }

        commandList.push(modelCommandLists);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Model
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Model#destroy
     */
    Model.prototype.isDestroyed = function() {
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
     * @memberof Model
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Model#isDestroyed
     *
     * @example
     * e = e && e.destroy();
     */
    Model.prototype.destroy = function() {
        return destroyObject(this);
    };

    return Model;
});