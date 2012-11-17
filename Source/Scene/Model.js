/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Matrix4',
        '../Core/loadText',
        '../Core/loadArrayBuffer',
        '../Core/loadImage',
        '../Core/clone',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/ComponentDatatype',
        '../Renderer/BufferUsage',
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
        loadImage,
        clone,
        IndexDatatype,
        PrimitiveType,
        ComponentDatatype,
        BufferUsage,
        CommandLists,
        DrawCommand,
        SceneMode,
        WebGLTFLoader) {
    "use strict";

    // MODELS_TODO: This needs tests
    // MODELS_TODO: model cache?

    var ModelLoader = Object.create(WebGLTFLoader, {
        handleBuffer: {
            value: function(entryID, description, userInfo) {
                var resourcesToCreate = userInfo._resourcesToCreate;
                var buffers = resourcesToCreate.buffers;

                if (typeof buffers[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate buffer entryID, ' + entryID + ' from path ' + description.path);
                }

                ++resourcesToCreate.pendingRequests;

                loadArrayBuffer(description.path).then(function(arrayBuffer) {
                    buffers[entryID] = arrayBuffer;
                    --resourcesToCreate.pendingRequests;
                }, function() {
                    // MODELS_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
                    throw new RuntimeError('Could not load buffer entryID, ' + entryID + ' from path ' + description.path);
                });

                return true;
            }
        },

        handleImage : {
            value: function(entryID, description, userInfo) {
                var resourcesToCreate = userInfo._resourcesToCreate;
                var images = resourcesToCreate.images;

                if (typeof images[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate image entryID, ' + entryID + ' from path ' + description.path);
                }

                ++resourcesToCreate.pendingRequests;

                loadImage(description.path).then(function(image) {
                    images[entryID] = image;
                    --resourcesToCreate.pendingRequests;
                }, function() {
                    // MODELS_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
                    throw new RuntimeError('Could not load image entryID, ' + entryID + ' from path ' + description.path);
                });
            }
        },

        handleShader: {
            value: function(entryID, description, userInfo) {
                var resourcesToCreate = userInfo._resourcesToCreate;
                var shaders = resourcesToCreate.shaders;

                if (typeof shaders[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate shader shader entryID, ' + entryID + ' from path ' + description.path);
                }

                ++resourcesToCreate.pendingRequests;

                loadText(description.path).then(function(text) {
                    shaders[entryID] = text;
                    --resourcesToCreate.pendingRequests;
                }, function() {
                    // MODELS_TODO: Instead of throwing Runtime errors, should we just warn and render with what we have?
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
                    throw new RuntimeError('Duplicate technique entryID, ' + entryID);
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
                var materials = userInfo._resourcesToCreate.materials;

                if (typeof materials[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate material entryID, ' + entryID);
                }

                var techniques = description.techniques;

                for (var property in techniques) {
                    if (techniques.hasOwnProperty(property)) {

                        var materialParameters = {};

                        var parameters = techniques[property].parameters;
                        for (var p in parameters) {
                            if (parameters.hasOwnProperty(p)) {
                                var parameter = parameters[p];

                                if (typeof parameter.image !== 'undefined') {
                                    materialParameters[p] = clone(parameter);
                                }
                                // MODELS_TODO: else handle other parameters
                            }
                        }

                        // MODELS_TODO: This assumes one technique per material
                        materials[entryID] = {
                            techniqueID : property,
                            // MODELS_TODO: actually use parameters
                            parameters : materialParameters
                        };
                    }
                }

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
                var meshes = userInfo._resourcesToCreate.meshes;

                if (typeof meshes[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate mesh entryID, ' + entryID);
                }

                meshes[entryID] = clone(description);

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
                var scenes = userInfo._resourcesToCreate.scenes;

                if (typeof scenes[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate scene entryID, ' + entryID);
                }

                scenes[entryID] = clone(description);
                userInfo._resourcesToCreate.jsonReady = true;

                return true;
            }
        },

        handleNode: {
            value: function(entryID, description, userInfo) {
                var nodes = userInfo._resourcesToCreate.nodes;

                if (typeof nodes[entryID] !== 'undefined') {
                    throw new RuntimeError('Duplicate node entryID, ' + entryID);
                }

                nodes[entryID] = clone(description);

                return true;
            }
        }
    });

    function destroyResourcesToCreate(resourcesToCreate) {
        resourcesToCreate.buffers = {};
        resourcesToCreate.images = {};
        resourcesToCreate.shaders = {};
        resourcesToCreate.techniques = {};
        resourcesToCreate.materials = {};
        resourcesToCreate.meshes = {};
        resourcesToCreate.nodes = {};
        resourcesToCreate.scenes = {};
        resourcesToCreate.jsonReady = false;
        resourcesToCreate.pendingRequests = 0;
    }

    function destroyResources(resources) {
        var techniques = resources.techniques;
        for (var shader in techniques) {
            if (techniques.hasOwnProperty(shader)) {
                techniques[shader].program.release();
            }
        }

        var textures = resources.textures;
        for (var texture in textures) {
            if (textures.hasOwnProperty(texture)) {
                textures[texture].destroy();
            }
        }

        var vertexBuffers = resources.vertexBuffers;
        for (var vertexBuffer in vertexBuffers) {
            if (vertexBuffers.hasOwnProperty(Array)) {
                vertexBuffers[vertexBuffer].destroy();
            }
        }

        var indexBuffers = resources.indexBuffers;
        for (var indexBuffer in indexBuffers) {
            if (indexBuffers.hasOwnProperty(Array)) {
                indexBuffers[indexBuffer].destroy();
            }
        }

        resources.techniques = {};
        resources.materials = {};
        resources.textures = {};
        resources.vertexBuffers = {};
        resources.indexBuffers = {};
        resources.vertexArrays = {};
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

        /**
         * A uniform scale applied to this model before the {@link Model#modelMatrix}.
         * Values greater than <code>1.0</code> increase the size of the model; values
         * less than <code>1.0</code> decrease.
         * <p>
         * The default is <code>1.0</code>, which uses the model's original size.
         * </p>
         *
         * @type Number
         */
        this.scale = 1.0;

        // Derived from modelMatrix and scale.
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

        this._colorCommands = [];
        this._commandLists = new CommandLists();

        this._resourcesToCreate = {
            buffers : {
            },
            images : {
            },
            shaders : {
            },
            techniques : {
            },
            materials : {
            },
            meshes : {
            },
            nodes : {
            },
            scenes : {
            },
            jsonReady : false,
            pendingRequests : 0
        };
        this._resources = {
            techniques : {
            },
            materials : {
            },
            textures : {
            },
            vertexBuffers : {
            },
            indexBuffers : {
            },
            vertexArrays : {
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

        destroyResourcesToCreate(this._resourcesToCreate);
        destroyResources(this._resources);

        var modelLoader = Object.create(ModelLoader);
        modelLoader.initWithPath(url);
        modelLoader.load(this);
    };

    function createAttributeIndices(technique) {
        var indices = {};

        var attributes = technique.attributes;
        var j = 0;

        for (var property in attributes) {
            if (attributes.hasOwnProperty(property)) {
// ************ MODELS_TODO: This is a hack that assumes symbol and semantic never have the same name for all attributes.  Break into separate data structures.
                indices[attributes[property].symbol] = j;
                indices[attributes[property].semantic] = j++;
            }
        }

        return indices;
    }

    var uniformSemantics = {
        WORLD : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getModel();
                };
            }
        },
        VIEW : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getView();
                };
            }
        },
        PROJECTION : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getProjection();
                };
            }
        },
        WORLDVIEW : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getModelView();
                };
            }
        },
        VIEWPROJECTION : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getViewProjection();
                };
            }
        },
        WORLDVIEWPROJECTION : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getModelViewProjection();
                };
            }
        },
        WORLDINVERSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getInverseModel();
                };
            }
        },
        VIEWINVERSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getInverseView();
                };
            }
        },
        PROJECTIONINVERSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getInverseProjection();
                };
            }
        },
        WORLDVIEWINVERSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getInverseModelView();
                };
            }
        },
        VIEWPROJECTIONINVERSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    return uniformState.getInverseViewProjection();
                };
            }
        },
        WORLDVIEWPROJECTIONINVERSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        WORLDTRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        VIEWTRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        PROJECTIONTRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        WORLDVIEWTRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        VIEWPROJECTIONTRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        WORLDVIEWPROJECTIONTRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        WORLDINVERSETRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        VIEWINVERSETRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        PROJECTIONINVERSETRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        WORLDVIEWINVERSETRANSPOSE : {
            type : 'FLOAT_MAT3',

            get : function(uniformState) {
                return function() {
                    return uniformState.getNormal();
                };
            }
        },
        VIEWPROJECTIONINVERSETRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        },
        WORLDVIEWPROJECTIONINVERSETRANSPOSE : {
            type : 'FLOAT_MAT4',

            get : function(uniformState) {
                return function() {
                    // MODELS_TODO:
                    throw new RuntimeError('MODELS_TODO: uniform semantics');
                };
            }
        }
    };

    function createUniformMap(context, model, technique) {
        var images = model._resourcesToCreate.images;
        var textures = model._resources.textures;

        var uniformMap = {};

        var uniforms = technique.uniforms;
        var len = uniforms.length;
        for (var i = 0; i < len; ++i) {
            var uniform = uniforms[i];

            if (typeof uniform.semantic !== 'undefined') {
                // MODELS_TODO:  Move semantics into the renderer?

                var semantic = uniformSemantics[uniform.semantic];

                if (typeof semantic !== 'undefined') {
                    if (uniform.type !== semantic.type) {
                        throw new RuntimeError('The type for uniform symbol, ' + uniform.symbol + ', is ' + uniform.type + ', but we expect it to be ' + semantic.type + ' since its semantic is ' + uniform.semantic);
                    }

                    uniformMap[uniform.symbol] = semantic.get(context.getUniformState());
                } else {
                    throw new RuntimeError('Uniform symbol, ' + uniform.symbol + ', with type, ' + uniform.type + ', has unknown semantic, ' + uniform.semantic);
                }
            } else if (typeof uniform.parameter !== 'undefined') {
                // MODELS_TODO: set with uniform.parameter.  do not assume it is a texture.
                uniformMap[uniform.symbol] = function() {

                    // MODELS_TODO: real texture cache
                    if (textures[uniform.parameter]) {
                        return textures[uniform.parameter];
                    } else if (typeof images["image_0"] !== 'undefined') {
                        // MODELS_TODO: this is hard-coded and a big hack.  this belongs with the material, not here with the technique.
                        var img = images["image_0"];
                        textures[uniform.parameter] = context.createTexture2D({
                            source : img,
                            flipY : false
                        });
                        delete images["image_0"];

                        return textures[uniform.parameter];
                    }

                    return context.getDefaultTexture();
                };
            } else {
                throw new RuntimeError('Uniform symbol, ' + uniform.symbol + ', does not have a semantic or a parameter.');
            }
        }

        return uniformMap;
    }

    function createTechniques(context, model) {
        var resourcesToCreate = model._resourcesToCreate;
        var shaders = resourcesToCreate.shaders;
        var techniques = resourcesToCreate.techniques;

        for (var property in techniques) {
            if (techniques.hasOwnProperty(property)) {
                var technique = techniques[property];
                var vs = shaders[technique.vertexShaderEntityID];
                var fs = shaders[technique.fragmentShaderEntityID];

                var attributeIndices = createAttributeIndices(technique);

                var loadedTechnique = {
                    program : context.getShaderCache().getShaderProgram(vs, fs, attributeIndices),
                    attributeIndices : attributeIndices,
                    uniformMap : createUniformMap(context, model, technique)
                };
                model._resources.techniques[property] = loadedTechnique;
            }
        }
    }

    function createMaterials(context, model) {
        var techniques = model._resources.techniques;
        var materials = model._resourcesToCreate.materials;

        for (var property in materials) {
            if (materials.hasOwnProperty(property)) {
                var material = materials[property];
                var technique = techniques[material.techniqueID];

                model._resources.materials[property] = {
                    technique : technique
                };
            }
        }
    }

    function createVertexBuffers(context, model, accessors) {
        var vertexBuffers = model._resources.vertexBuffers;
        var loadedBuffers = model._resourcesToCreate.buffers;

        for (var property in accessors) {
            if (accessors.hasOwnProperty(property)) {
                var accessor = accessors[property];

                // MODELS_TODO: With only unsigned short indices, can we create a vertex buffer if it is too big?
                // MODELS_TODO: The buffer also contains indices, which are not used; they are duplicated in an index buffer.
                if (typeof vertexBuffers[accessor.buffer] === 'undefined') {
                    vertexBuffers[accessor.buffer] = context.createVertexBuffer(loadedBuffers[accessor.buffer], BufferUsage.STATIC_DRAW);
                }
            }
        }
    }

    function createIndexBuffers(context, model, primitives) {
        var indexBuffers = model._resources.indexBuffers;
        var loadedBuffers = model._resourcesToCreate.buffers;

        // MODELS_TODO: Combine buffers and adjust offsets in drawElements for better performance.
        var len = primitives.length;
        for (var i = 0; i < len; ++i) {
            var indices = primitives[i].indices;
            var key = JSON.stringify(indices);

            if (typeof indexBuffers[key] === 'undefined') {
                var indicesArray;
                var type;
                if (indices.type === "Uint16Array") {
                    indicesArray = new Uint16Array(loadedBuffers[indices.buffer], indices.byteOffset, indices.length);
                    type = IndexDatatype.UNSIGNED_SHORT;
                } else {
                    indicesArray = new Uint8Array(loadedBuffers[indices.buffer], indices.byteOffset, indices.length);
                    type = IndexDatatype.UNSIGNED_BYTE;
                }

                indexBuffers[key] = context.createIndexBuffer(indicesArray, BufferUsage.STATIC_DRAW, type);
            }
        }
    }

    function getComponentDatatype(elementType) {
        switch (elementType) {
            case 'Float32':
                return ComponentDatatype.FLOAT;
            case 'Uint32':
                // MODELS_TODO: Should not be part of WebGL TF?
                throw new RuntimeError('Uint32 not supported');
            case 'Uint16':
                return ComponentDatatype.UNSIGNED_SHORT;
            case 'Int16':
                return ComponentDatatype.SHORT;
            case 'Uint8':
                return ComponentDatatype.UNSIGNED_BYTE;
            case 'Int8':
                return ComponentDatatype.BYTE;
        }

        throw new RuntimeError('Unknown elementType: ' + elementType);
    }

    function createVertexArrays(context, model, mesh, property) {
        var materials = model._resources.materials;
        var vertexBuffers = model._resources.vertexBuffers;
        var indexBuffers = model._resources.indexBuffers;

        var vertexArrays = [];

        var primitives = mesh.primitives;
        var len = primitives.length;
        for (var i = 0; i < len; ++i) {
            var primitive = primitives[i];

            if (typeof PrimitiveType[primitive.primitive] === 'undefined') {
                throw new RuntimeError('Mesh with entityID, ' + property + ', has primitive[' + i + '] with an unknown primitive: ' + primitive.primitive);
            }

            var attributeIndices = materials[primitive.material].technique.attributeIndices;
            var attributes = [];

            var vertexAttributes = primitive.vertexAttributes;
            var vertexAttributesLen = vertexAttributes.length;
            for (var j = 0; j < vertexAttributesLen; ++j) {
                var vertexAttribute = vertexAttributes[j];
                var accessor = mesh.accessors[vertexAttribute.accessor];

                // TODO: use accessor min and max for bounding volume
                attributes.push({
                    index                  : attributeIndices[vertexAttribute.semantic],
                    enabled                : true,
                    vertexBuffer           : vertexBuffers[accessor.buffer],
                    componentsPerAttribute : accessor.elementsPerValue,
                    componentDatatype      : getComponentDatatype(accessor.elementType),
                    normalize              : false,
                    offsetInBytes          : accessor.byteOffset,
                    strideInBytes          : accessor.byteStride
                });
            }

            vertexArrays.push({
                materialID : primitive.material,
                primitive : PrimitiveType[primitive.primitive],
                vertexArray : context.createVertexArray(attributes, indexBuffers[JSON.stringify(primitive.indices)]),
            });
        }

        model._resources.vertexArrays[property] = vertexArrays;
    }

    function createMeshes(context, model) {
        var meshes = model._resourcesToCreate.meshes;

        for (var property in meshes) {
            if (meshes.hasOwnProperty(property)) {
                var mesh = meshes[property];

                // MODELS_TODO: create vertex arrays once buffers are loaded.
                // MODELS_TODO: Do not duplicate vertex arrays if two nodes share them, e.g., texture coordinates.
                // MODELS_TODO: interleave if they aren't ready.
                createVertexBuffers(context, model, mesh.accessors);
                createIndexBuffers(context, model, mesh.primitives);
                createVertexArrays(context, model, mesh, property);
            }
        }
    }

    function createNodes(context, model) {
        var nodes = model._resourcesToCreate.nodes;
        var vertexArrays = model._resources.vertexArrays;
        var materials = model._resources.materials;
        var colorCommands = model._colorCommands;

        for (var property in nodes) {
            if (nodes.hasOwnProperty(property)) {
                var node = nodes[property];

                if (node.type === 'node') {
                    // MODELS_TODO: handle children.  Do we have to traverse them here though?  Or are they provided in linearly?
// **************** MODELS_TODO: use matrix

                    if (typeof node.meshes !== 'undefined') {
                        var meshes = node.meshes;
                        var len = meshes.length;
                        for (var i = 0; i < len; ++i) {
                            var vas = vertexArrays[meshes[i]];

                            var vasLen = vas.length;
                            for (var j = 0; j < vasLen; ++j) {
                                var va = vas[j];
                                var technique = materials[va.materialID].technique;

                                var command = new DrawCommand();
                                command.boundingVolume = undefined; // MODELS_TODO: set this
//                                command.modelMatrix = model.modelMatrix;
                                command.primitiveType = va.primitive;
                                command.vertexArray = va.vertexArray;
                                command.shaderProgram = technique.program;
                                command.uniformMap = technique.uniformMap;
                                command.renderState = context.createRenderState({
                                    depthTest : {
                                        enabled : true
                                    }
                                });  // MODELS_TODO: use real render state
                                colorCommands.push(command);
                            }
                        }
                    }
                    // MODELS_TODO: handle nodes without meshes like ones with cameras and lights
                }
                // MODELS_TODO: what other types exist?
            }
        }
    }

    function createResources(context, model) {
        var resourcesToCreate = model._resourcesToCreate;

        // MODELS_TODO: Progressively load; this is embarrassing.
        if (resourcesToCreate.jsonReady && resourcesToCreate.pendingRequests === 0) {
            createTechniques(context, model);
            createMaterials(context, model);
            createMeshes(context, model);
            createNodes(context, model);

            destroyResourcesToCreate(resourcesToCreate);
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

        if (frameState.passes.color) {
// MODELS_TODO:  IIS hack
//
// var rotate = new Matrix4(
//     1.0, 0.0, 0.0, 0.0,
//     0.0, Math.cos(-Math.PI / 2.0), -Math.sin(-Math.PI / 2.0), 0.0,
//     0.0, Math.sin(-Math.PI / 2.0), Math.cos(-Math.PI / 2.0), 0.0,
//     0.0, 0.0, 0.0, 1.0);
// var rs = Matrix4.multiplyByUniformScale(rotate, this.scale);
// this._computedModelMatrix = Matrix4.multiply(this.modelMatrix, rs);

            Matrix4.multiplyByUniformScale(this.modelMatrix, this.scale, this._computedModelMatrix);

            var commandsLength = this._colorCommands.length;

            for (var i = 0; i < commandsLength; ++i) {
                this._colorCommands[i].modelMatrix = this._computedModelMatrix;
            }

            modelCommandLists.colorList = this._colorCommands;
        }
        else {
            modelCommandLists.colorList.length = 0;
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
