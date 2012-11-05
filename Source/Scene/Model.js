/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Matrix4',
        '../Core/loadText',
        '../Core/loadArrayBuffer',
        '../Core/clone',
        '../Renderer/CommandLists',
        '../Renderer/DrawCommand',
        './SceneMode',
        '../ThirdParty/webgl-tf-loader'
    ], function(
        DeveloperError,
        RuntimeError,
        Matrix4,
        loadText,
        loadArrayBuffer,
        clone,
        CommandLists,
        DrawCommand,
        SceneMode,
        WebGLTFLoader) {
    "use strict";

    // MODELS_TODO: This needs tests

    var ModelLoader = Object.create(WebGLTFLoader, {
        handleBuffer: {
            value: function(entryID, description, userInfo) {
                loadArrayBuffer(description.path).then(function(arrayBuffer) {
                    var buffers = userInfo._resourcesToCreate.buffers;

                    if (typeof buffers[entryID] !== 'undefined') {
                        throw new RuntimeError('Duplicate buffer entryID, ' + entryID + ' from path ' + description.path);
                    }

                    buffers[entryID] = arrayBuffer;
                }, function() {
                    // MODEL_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
                    throw new RuntimeError('Could not load buffer entryID, ' + entryID + ' from path ' + description.path);
                });

                return true;
            }
        },

        handleShader: {
            value: function(entryID, description, userInfo) {
                loadText(description.path).then(function(text) {
                    var shaders = userInfo._resourcesToCreate.shaders;

                    if (typeof shaders[entryID] !== 'undefined') {
                        throw new RuntimeError('Duplicate shader shader entryID, ' + entryID + ' from path ' + description.path);
                    }

                    shaders[entryID] = text;
                }, function() {
                    // MODEL_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
                    throw new RuntimeError('Could not load shader entryID, ' + entryID + ' from path ' + description.path);
                });

                return true;
            }
        },

        handleTechnique: {
            value: function(entryID, description, userInfo) {
                // MODELS_TODO: Are entryIDs for techniques globally unique?
                var techniques = userInfo._resourcesToCreate.techniques;

                if (typeof techniques[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate technique entryID, ' + entryID + ' from path ' + description.path);
                }

                // MODELS_TODO: Build delayed shader compiling into the shader program itself?
                var passes = description.passes;

                for (var property in passes) {
                    if (passes.hasOwnProperty(property)) {
                        var pass = passes[property];
                        var program = pass.program;

                        // MODELS_TODO: This assumes one pass per technique
                        techniques[entryID] = {
                            vertexShaderEntityID : program['x-shader/x-vertex'],
                            fragmentShaderEntityID : program['x-shader/x-fragment'],
                            attributes : clone(program.attributes),
                            uniforms : clone(program.uniforms)
                        };

                        // MODELS_TODO: do not ignore passes[pass].states
                    }
                }

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

    function destroyResources(resources) {
        var techniques = resources.techniques;

        for (var shader in techniques) {
            if (techniques.hasOwnProperty(shader)) {
                techniques[shader].program.release();
            }
        }
        resources.techniques = {};
    }

    /**
     * DOC_TBA
     *
     * @alias Model
     * @constructor
     */
    var Model = function(url) {
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

        this._resourcesToCreate = {
            buffers : {
            },
            shaders : {
            },
            techniques : {
            }
        };
        this._resources = {
            techniques : {
            }
        };

        if (typeof url !== 'undefined') {
            this.load(url);
        }
    };

    /**
     * DOC_TBA
     *
     * @exception {DeveloperError} url is required.
     */
    Model.prototype.load = function(url) {
        if (typeof url === 'undefined') {
            throw new DeveloperError('url is required');
        }

        this._resourcesToCreate.buffers = {};
        this._resourcesToCreate.shaders = {};
        this._resourcesToCreate.techniques = {};
        destroyResources(this._resources);

        var modelLoader = Object.create(ModelLoader);
        modelLoader.initWithPath(url);
        modelLoader.load(this);
    };

    function createResources(context, model) {
        var resourcesToCreate = model._resourcesToCreate;
        var shaders = resourcesToCreate.shaders;
        var techniques = resourcesToCreate.techniques;

        for (var property in techniques) {
            if (techniques.hasOwnProperty(property)) {
                var technique = techniques[property];
                var vs = shaders[technique.vertexShaderEntityID];
                var fs = shaders[technique.fragmentShaderEntityID];

                // MODELS_TODO: dependency graph for loading shaders first
                if ((typeof vs !== 'undefined') && (typeof fs !== 'undefined')) {
// **************** MODELS_TODO: attributeIndices

                    var loadedTechnique = {
                        program : context.getShaderCache().getShaderProgram(vs, fs),
                        uniformMap : {}
                    };
                    model._resources.techniques[property] = loadedTechnique;

                    var uniformMap = loadedTechnique.uniformMap;

                    var uniforms = technique.uniforms;
                    var len = uniforms.length;
                    for (var i = 0; i < len; ++i) {
                        var uniform = uniforms[i];

                        if (typeof uniform.semantic !== 'undefined') {
                            switch (uniform.semantic) {
                                case 'WORLDVIEW':
                                    if (uniform.type !== 'FLOAT_MAT4') {
                                        throw new RuntimeError('The type for uniform symbol, ' + uniform.symbol + ', is ' + uniform.type + ', but we expect it to be FLOAT_MAT4 since its semantic is FLOAT_MAT4');
                                    }

                                    uniformMap[uniform.symbol] = function() {
// ************************************ MODELS_TODO: this is burnt with our model matrix right?  Both the model's and the node's?
                                        return context.getUniformState().getModelView();
                                    };

                                    break;
                                case 'WORLDVIEWINVERSETRANSPOSE':
                                    if (uniform.type !== 'FLOAT_MAT3') {
                                        throw new RuntimeError('The type for uniform symbol, ' + uniform.symbol + ', is ' + uniform.type + ', but we expect it to be FLOAT_MAT3 since its semantic is WORLDVIEWINVERSETRANSPOSE');
                                    }

                                    uniformMap[uniform.symbol] = function() {
                                         return context.getUniformState().getNormal();
                                     };

                                    break;
                                case 'PROJECTION':
                                    if (uniform.type !== 'FLOAT_MAT4') {
                                        throw new RuntimeError('The type for uniform symbol, ' + uniform.symbol + ', is ' + uniform.type + ', but we expect it to be FLOAT_MAT4 since its semantic is PROJECTION');
                                    }

                                    uniformMap[uniform.symbol] = function() {
                                        return context.getUniformState().getProjection();
                                    };

                                    break;
                                default:
                                    // MODELS_TODO:
                                    throw new RuntimeError('TODO: Add more uniform semantics');
                            }
                        } else if (typeof uniform.parameter !== 'undefined') {
                            // MODELS_TODO: set with uniform.parameter.  do not assume default texture.
                            uniformMap[uniform.symbol] = function() {
                                return context.getDefaultTexture();
                            };
                        } else {
                            throw new RuntimeError('Uniform symbol, ' + uniform.symbol + ', does not have a semantic or a parameter.');
                        }
                    }

                    delete techniques[property];
                }
            }
        }
    }

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

        createResources(context, this);

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
        destroyResources(this._resources);
        return destroyObject(this);
    };

    return Model;
});