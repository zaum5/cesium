/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/RuntimeError',
        '../Core/Matrix4',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/loadText',
        '../Core/loadArrayBuffer',
        '../Core/loadImage',
        '../Core/clone',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/ComponentDatatype',
        '../Core/BoundingSphere',
        '../Core/defaultValue',
        '../Core/destroyObject',
        '../Core/combine',
        '../Renderer/BufferUsage',
        '../Renderer/CommandLists',
        '../Renderer/CullFace',
        '../Renderer/DrawCommand',
        '../Renderer/BlendingState',
        './SceneMode',
        '../ThirdParty/webgl-tf-loader'
    ], function(
        DeveloperError,
        RuntimeError,
        Matrix4,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        loadText,
        loadArrayBuffer,
        loadImage,
        clone,
        IndexDatatype,
        PrimitiveType,
        ComponentDatatype,
        BoundingSphere,
        defaultValue,
        destroyObject,
        combine,
        BufferUsage,
        CommandLists,
        CullFace,
        DrawCommand,
        BlendingState,
        SceneMode,
        WebGLTFLoader) {
    "use strict";

    // MODELS_TODO: This needs tests
    // MODELS_TODO: model cache?  Caching individual buffers and textures may be all that is needed.

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
                            uniforms : clone(program.uniforms),
                            states : clone(pass.states)
                        };
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
                        // MODELS_TODO: This assumes one technique per material
                        materials[entryID] = {
                            techniqueID : property,
                            parameters : clone(techniques[property].parameters)
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
                userInfo._resourcesToCreate.jsonReady = true;
                return true;
            }
        },

        handleNode: {
            value: function(entryID, description, userInfo) {
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
        resourcesToCreate.jsonReady = false;
        resourcesToCreate.pendingRequests = 0;
    }

    function destroyResources(resources) {
        var techniques = resources.techniques;
        for (var shader in techniques) {
            if (techniques.hasOwnProperty(shader)) {
                techniques[shader].program.release();
                techniques[shader].pickProgram.release();
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

        var pickIds = resources.pickIds;
        for (var i = 0; i < pickIds.length; ++i) {
            pickIds.destroy();
        }

        resources.techniques = {};
        resources.materials = {};
        resources.textures = {};
        resources.vertexBuffers = {};
        resources.indexBuffers = {};
        resources.vertexArrays = {};
        resources.pickIds = [];
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
        this._modelMatrix = Matrix4.IDENTITY.clone();

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
        this._scale = 1.0;

        // Derived from modelMatrix and scale.
        this._computedModelMatrix = Matrix4.IDENTITY.clone();

        this._transformsDirty = false;

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
        this._pickCommands = [];
        this._commandLists = new CommandLists(); // To reduce allocations in update()

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
            },
            pickIds : []
        };

        this._modelLoader = undefined;
        this._root = undefined;
        this._nodeStack = []; // To reduce allocations in update()

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

        this._colorCommands = [];
        this._pickCommands = [];
        destroyResourcesToCreate(this._resourcesToCreate);
        destroyResources(this._resources);
        this._root = undefined;
        this._nodeStack = [];

        var modelLoader = Object.create(ModelLoader);
        modelLoader.initWithPath(url);
        modelLoader.load(this);
        this._modelLoader = modelLoader;
    };

    function createAttributeIndices(technique) {
        var indices = {
            bySymbol : {
            },
            bySemantic : {
            }
        };

        var attributes = technique.attributes;

        for (var i = 0; i < attributes.length; ++i) {
            var attribute = attributes[i];
            indices.bySymbol[attribute.symbol] = i;
            indices.bySemantic[attribute.semantic] = i;
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

    var uniformParameters = {
        FLOAT : function(context, model, uniform, parameter) {
            return function() {
                return parameter;
            };
        },
        FLOAT_VEC2 : function(context, model, uniform, parameter) {
            var v = new Cartesian2(parameter[0], parameter[1]);

            return function() {
                return v;
            };
        },
        FLOAT_VEC3 : function(context, model, uniform, parameter) {
            var v = new Cartesian3(parameter[0], parameter[1], parameter[2]);

            return function() {
                return v;
            };
        },
        FLOAT_VEC4 : function(context, model, uniform, parameter) {
            var v = new Cartesian4(parameter[0], parameter[1], parameter[2], parameter[3]);

            return function() {
                return v;
            };
        },
        SAMPLER_2D : function(context, model, uniform, parameter) {
            var images = model._resourcesToCreate.images;
            var textures = model._resources.textures;

            // MODELS_TODO: real texture cache
            if (typeof textures[parameter.image] === 'undefined') {
                // MODELS_TODO: use filtering states
                textures[parameter.image] = context.createTexture2D({
                    source : images[parameter.image],
                    flipY : false
                });
                delete images[parameter.image];
            }

            return function() {
                return textures[parameter.image];
            };
        }
    };

    function createUniformMap(context, model, technique, parameters) {
        var uniformMap = {};

        var uniforms = technique.uniforms;
        var len = uniforms.length;
        for (var i = 0; i < len; ++i) {
            var uniform = uniforms[i];

            if (typeof uniform.semantic !== 'undefined') {
                // MODELS_TODO:  Move semantics into the renderer?

                var semantic = uniformSemantics[uniform.semantic];

                if (typeof semantic !== 'undefined') {
                    // MODELS_TODO:  Support different types for the same semantic
                    if (uniform.type !== semantic.type) {
                        throw new RuntimeError('The type for uniform symbol, ' + uniform.symbol + ', is ' + uniform.type + ', but we expect it to be ' + semantic.type + ' since its semantic is ' + uniform.semantic);
                    }

                    uniformMap[uniform.symbol] = semantic.get(context.getUniformState());
                } else {
                    throw new RuntimeError('Uniform symbol, ' + uniform.symbol + ', with type, ' + uniform.type + ', has unknown semantic, ' + uniform.semantic);
                }
            } else if (typeof uniform.parameter !== 'undefined') {

                var parameter = uniformParameters[uniform.type];

                if (typeof parameter !== 'undefined') {
                    uniformMap[uniform.symbol] = parameter(context, model, uniform, parameters[uniform.parameter]);
                } else {
                    // MODELS_TODO: Add support for
                    //
                    // GL_INT
                    // GL_INT_VEC2
                    // GL_INT_VEC3
                    // GL_INT_VEC4
                    // GL_BOOL
                    // GL_BOOL_VEC2
                    // GL_BOOL_VEC3
                    // GL_BOOL_VEC4
                    // GL_FLOAT_MAT2
                    // GL_FLOAT_MAT3
                    // GL_FLOAT_MAT4
                    // GL_SAMPLER_CUBE
                    throw new RuntimeError('MODELS_TODO: Support more uniform types.');
                }
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

// TODO: This will fail if "main" is part of the name of a called library function.
                var renamedFS = fs.replace(new RegExp('main', 'g'), 'czm_glTF_old_main');
// TODO: glTF needs translucent flag so we know if we need its fragment shader.
                var pickMain =
                    'uniform vec4 czm_glTF_pickColor; \n' +
                    'void main() \n' +
                    '{ \n' +
                    '    czm_glTF_old_main(); \n' +
                    '    if (gl_FragColor.a == 0.0) { \n' +
                    '        discard; \n' +
                    '    } \n' +
                    '    gl_FragColor = czm_glTF_pickColor; \n' +
                    '}';
                var pickFS = renamedFS + '\n' + pickMain;

                var loadedTechnique = {
                    program : context.getShaderCache().getShaderProgram(vs, fs, attributeIndices.bySymbol),
                    pickProgram : context.getShaderCache().getShaderProgram(vs, pickFS, attributeIndices.bySymbol),
                    attributeIndices : attributeIndices,
                    uniforms : technique.uniforms,
                    states : technique.states
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
                    technique : technique,
                    uniformMap : createUniformMap(context, model, technique, material.parameters)
                };
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

    function createVertexBuffers(context, model, accessors) {
        var vertexBuffers = model._resources.vertexBuffers;
        var loadedBuffers = model._resourcesToCreate.buffers;

        // MODELS_TODO: Combine buffers for better performance.
        for (var property in accessors) {
            if (accessors.hasOwnProperty(property)) {
                var accessor = accessors[property];
                var key = JSON.stringify(accessor);

                if (typeof vertexBuffers[key] === 'undefined') {
                    var verticesArray;
                    var attributeSizeInBytes = accessor.elementsPerValue * getComponentDatatype(accessor.elementType).sizeInBytes;
                    if (attributeSizeInBytes === accessor.byteStride) {
                        verticesArray = new Uint8Array(loadedBuffers[accessor.buffer],
                            accessor.byteOffset, accessor.count * attributeSizeInBytes);
                    } else {
                        // MODELS_TODO: Support interleaved attributes
                        throw new RuntimeError('MODELS_TODO: Support interleaved attributes');
                    }

                    vertexBuffers[key] = context.createVertexBuffer(verticesArray, BufferUsage.STATIC_DRAW);
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

            var boundingSphere = undefined;
            var vertexAttributes = primitive.vertexAttributes;
            var vertexAttributesLen = vertexAttributes.length;
            for (var j = 0; j < vertexAttributesLen; ++j) {
                var vertexAttribute = vertexAttributes[j];
                var accessor = mesh.accessors[vertexAttribute.accessor];

                attributes.push({
                    index                  : attributeIndices.bySemantic[vertexAttribute.semantic],
                    enabled                : true,
                    vertexBuffer           : vertexBuffers[JSON.stringify(accessor)],
                    componentsPerAttribute : accessor.elementsPerValue,
                    componentDatatype      : getComponentDatatype(accessor.elementType),
                    normalize              : false,
                    strideInBytes          : accessor.byteStride
                });

                // TODO: The spec is going to change VERTEX to POSITION
                if ((vertexAttribute.semantic === 'VERTEX') && (accessor.elementsPerValue === 3)) {
                    boundingSphere = BoundingSphere.fromCornerPoints(Cartesian3.fromArray(accessor.min), Cartesian3.fromArray(accessor.max));
                }
            }

            vertexArrays.push({
                materialID : primitive.material,
                primitive : PrimitiveType[primitive.primitive],
                vertexArray : context.createVertexArray(attributes, indexBuffers[JSON.stringify(primitive.indices)]),
                boundingSphere : boundingSphere
            });
        }

        model._resources.vertexArrays[property] = vertexArrays;
    }

    function createMeshes(context, model) {
        var meshes = model._root.meshes;

        for (var property in meshes) {
            if (meshes.hasOwnProperty(property)) {
                var mesh = meshes[property];

                // MODELS_TODO: Do not duplicate vertex arrays if two nodes share them, e.g., texture coordinates.
                // MODELS_TODO: interleave if they aren't ready.
                createVertexBuffers(context, model, mesh.accessors);
                createIndexBuffers(context, model, mesh.primitives);
                createVertexArrays(context, model, mesh, property);
            }
        }
    }

    function createNodes(context, model) {
        var i;
        var len;
        var root = model._root;
        var scenes = root.scenes;
        var nodes = root.nodes;
        var vertexArrays = model._resources.vertexArrays;
        var materials = model._resources.materials;
        var pickIds = model._resources.pickIds;
        var colorCommands = model._colorCommands;
        var pickCommands = model._pickCommands;
        var nodeStack = model._nodeStack;
        var scale = model.scale;

        for (var property in scenes) {
            if (scenes.hasOwnProperty(property)) {
                var scene = scenes[property];

                var n = nodes[scene.node];
                // Computed transform from the root to this node.  This is
                // not part of the original model; is used for rendering.
                n._computedTransform = defaultValue(n.matrix, Matrix4.IDENTITY);
                nodeStack.push(n);

                while (nodeStack.length > 0) {
                    n = nodeStack.pop();

                    // DDR commands for this node.  This is not part of the original model;
                    // it is the commands to render this node.
                    n._commandContainers = [];
                    var commandContainers = n._commandContainers;

                    if (typeof n.meshes !== 'undefined') {
                        var meshes = n.meshes;
                        len = meshes.length;
                        for (i = 0; i < len; ++i) {
                            var mesh = meshes[i];

// TODO: Create type for pick owner?  Use for all primitives.
                            var owner = {
                                instance : model,
                                node : n
                            };

                            var pickId = context.createPickId(owner);
                            pickIds.push(pickId);

                            var pickColorFunction = (function(color) {
                                return function() {
                                    return color;
                                };
                            }(pickId.normalizedRgba));

                            var vas = vertexArrays[mesh];
                            var vasLen = vas.length;
                            for (var j = 0; j < vasLen; ++j) {
                                var va = vas[j];
                                var material = materials[va.materialID];
                                var technique = material.technique;

                                var boundingSphere = new BoundingSphere(va.boundingSphere.center, va.boundingSphere.radius * scale);
                                var renderState = context.createRenderState({    // MODELS_TODO: Complete render state support
                                    depthTest : {
                                        enabled : true
                                    },
                                    blending : technique.states.BLEND ? BlendingState.ALPHA_BLEND : BlendingState.DISABLED,
                                    cull : {
                                        enabled : true,
                                        face : CullFace.BACK
                                    }
                                });

                                var colorCommand = new DrawCommand(owner);
//                                colorCommand.debugShowBoundingVolume = true;
                                colorCommand.boundingVolume = boundingSphere;
                                colorCommand.modelMatrix = new Matrix4();            // Computed in update()
                                colorCommand.primitiveType = va.primitive;
                                colorCommand.vertexArray = va.vertexArray;
                                colorCommand.shaderProgram = technique.program;
                                colorCommand.uniformMap = material.uniformMap;
                                colorCommand.renderState = renderState;

                                var pickCommand = new DrawCommand(owner);
                                pickCommand.boundingVolume = boundingSphere;
                                pickCommand.modelMatrix = new Matrix4();            // Computed in update()
                                pickCommand.primitiveType = va.primitive;
                                pickCommand.vertexArray = va.vertexArray;
                                pickCommand.shaderProgram = technique.pickProgram;
                                pickCommand.uniformMap = combine([
                                    material.uniformMap, {
                                        czm_glTF_pickColor : pickColorFunction
                                    }], false, false);
                                pickCommand.renderState = renderState;

                                commandContainers.push({
                                    colorCommand : colorCommand,
                                    pickCommand : pickCommand,
                                    unscaledBoundingSphere : va.boundingSphere
                                });
                                colorCommands.push(colorCommand);
                                pickCommands.push(pickCommand);
                            }
                        }
                    }
                    // MODELS_TODO: handle nodes without meshes like ones with cameras and lights

                    var children = n.children;
                    len = children.length;
                    for (i = 0; i < len; ++i) {
                        var child = nodes[children[i]];
                        child._computedTransform = Matrix4.multiply(n._computedTransform, defaultValue(child.matrix, Matrix4.IDENTITY));
                        nodeStack.push(child);
                    }
                }
            }
        }
    }

    function createResources(context, model) {
        var resourcesToCreate = model._resourcesToCreate;

        // MODELS_TODO: Progressively load; this is embarrassing.
        if (resourcesToCreate.jsonReady && resourcesToCreate.pendingRequests === 0) {

            // TODO: if data URIs are used, we do not want to keep the buffers or images.
            model._root = model._modelLoader.rootDescription;
            model._transformsDirty = true;
            model._modelLoader = undefined;

            createTechniques(context, model);
            createMaterials(context, model);
            createMeshes(context, model);
            createNodes(context, model);

            destroyResourcesToCreate(resourcesToCreate);
        }

        // Return true if resources are loaded.
        return (typeof model._root !== 'undefined');
    }

    var emptyArray = [];

    /**
     * @private
     *
     * @exception {DeveloperError} this.material must be defined.
     */
    Model.prototype.update = function(context, frameState, commandList) {
        if (!this.show ||
            !createResources(context, this) ||
            (frameState.mode !== SceneMode.SCENE3D)) {
            return;
        }

        var modelCommandLists = this._commandLists;

        if (frameState.passes.color || frameState.passes.pick) {
            if (!Matrix4.equals(this._modelMatrix, this.modelMatrix) ||
                (this._scale !== this.scale) ||
                this._transformsDirty) {

                Matrix4.clone(this.modelMatrix, this._modelMatrix);
                this._scale = this.scale;
                this._transformsDirty = false;

                Matrix4.multiplyByUniformScale(this.modelMatrix, this.scale, this._computedModelMatrix);

                var i;
                var len;
                var scenes = this._root.scenes;
                var nodes = this._root.nodes;
                var nodeStack = this._nodeStack;
                var scale = this.scale;

                for (var property in scenes) {
                    if (scenes.hasOwnProperty(property)) {
                        var scene = scenes[property];
                        nodeStack.push(nodes[scene.node]);

                        while (nodeStack.length > 0) {
                            var n = nodeStack.pop();
                            var transform = n._computedTransform;
                            var commandContainers = n._commandContainers;

                            len = commandContainers.length;
                            for (i = 0; i < len; ++i) {
                                var container = commandContainers[i];
                                var colorCommand = container.colorCommand;
                                var pickCommand = container.pickCommand;
                                var radius = container.unscaledBoundingSphere.radius * scale;

                                Matrix4.multiply(this._computedModelMatrix, transform, colorCommand.modelMatrix);
                                colorCommand.boundingVolume.radius = radius;

                                Matrix4.clone(colorCommand.modelMatrix, pickCommand.modelMatrix);
                                pickCommand.boundingVolume.radius = radius;
                            }

                            var children = n.children;
                            len = children.length;
                            for (i = 0; i < len; ++i) {
                                nodeStack.push(nodes[children[i]]);
                            }
                        }
                    }
                }
            }

            modelCommandLists.colorList = frameState.passes.color ? this._colorCommands : emptyArray;
            modelCommandLists.pickList = frameState.passes.pick ? this._pickCommands : emptyArray;

            commandList.push(modelCommandLists);
        }
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
