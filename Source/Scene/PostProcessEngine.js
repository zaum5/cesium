/*global define*/
define([
        '../Core/destroyObject',
        '../Core/Cartesian2',
        '../Core/ComponentDatatype',
        '../Core/PrimitiveType',
        '../Renderer/RenderbufferFormat',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/PixelFormat',
        '../Renderer/PixelDatatype',
        '../Renderer/DrawCommand'
    ], function(
        destroyObject,
        Cartesian2,
        ComponentDatatype,
        PrimitiveType,
        RenderbufferFormat,
        BufferUsage,
        BlendingState,
        PixelFormat,
        PixelDatatype,
        DrawCommand) {
    "use strict";

    /**
     * @private
     */
    var PostProcessEngine = function() {
        this.framebuffer = undefined;
        this.glowFramebuffer = undefined;

        this._colorTexture = undefined;
// TODO: does the post-process engine need to know about explicit passes?  Or can the scene just configure it?
        this._glowTexture = undefined;
        this._depthTexture = undefined;
        this._depthRenderbuffer = undefined;

        this._colorStep = new Cartesian2();
        this._command = undefined;
    };

    var attributeIndices = {
        position : 0,
        textureCoordinates : 1
    };

// TODO: this is duplicate with ViewportQuad.js
    function getVertexArray(context) {
        // Per-context cache for viewport quads
        var vertexArray = context.cache.viewportQuad_vertexArray;

        if (typeof vertexArray !== 'undefined') {
            return vertexArray;
        }

        var mesh = {
            attributes : {
                position : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                       -1.0, -1.0,
                        1.0, -1.0,
                        1.0,  1.0,
                       -1.0,  1.0
                    ]
                },

                textureCoordinates : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : [
                        0.0, 0.0,
                        1.0, 0.0,
                        1.0, 1.0,
                        0.0, 1.0
                    ]
                }
            }
        };

        vertexArray = context.createVertexArrayFromMesh({
            mesh : mesh,
            attributeIndices : attributeIndices,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        context.cache.viewportQuad_vertexArray = vertexArray;
        return vertexArray;
    }

    PostProcessEngine.prototype.update = function(context, filters) {
        if ((typeof filters !== 'undefined') && (filters.length > 0)) {
            var fb = this.framebuffer;
            var width = context.getCanvas().clientWidth;
            var height = context.getCanvas().clientHeight;

            // Create framebuffer if it doesn't exist or the canvas changed size
            if ((typeof fb === 'undefined') ||
                (fb.getColorTexture().getWidth() !== width) ||
                (fb.getColorTexture().getHeight() !== height)) {

                this.freeResources();

                var colorTexture = context.createTexture2D({
                    width : width,
                    height : height
                });
// TODO: only create the glow texture and framebuffer if we know there will be a glow pass
                var glowTexture = context.createTexture2D({
                    pixelFormat : PixelFormat.LUMINANCE,
                    width : width,
                    height : height
                });

                var depthTexture = undefined;
                var depthRenderbuffer = undefined;

                if (context.getDepthTexture()) {
                    depthTexture = context.createTexture2D({
                        width : width,
                        height : height,
                        pixelFormat : PixelFormat.DEPTH_COMPONENT,
                        pixelDatatype : PixelDatatype.UNSIGNED_SHORT
                    });
                } else {
                    depthRenderbuffer = context.createRenderbuffer({
                        format : RenderbufferFormat.DEPTH_COMPONENT16
                    });
                }

                // Only depthTexture or depthRenderbuffer will be defined
                this.framebuffer = context.createFramebuffer({
                    colorTexture : colorTexture,
                    depthTexture : depthTexture,
                    depthRenderbuffer : depthRenderbuffer,
                    destroyAttachments : false
                });
                this.glowFramebuffer = context.createFramebuffer({
                    colorTexture : glowTexture,
                    depthTexture : depthTexture,
                    depthRenderbuffer : depthRenderbuffer,
                    destroyAttachments : false
                });

                this._colorTexture = colorTexture;
                this._glowTexture = glowTexture;
                this._depthTexture = depthTexture;
                this._depthRenderbuffer = depthRenderbuffer;
                this._colorStep.x = 1.0 / colorTexture.getWidth();
                this._colorStep.y = 1.0 / colorTexture.getHeight();
// TODO: need glow step?
            }

            var command = this._command;
            if (typeof command === 'undefined') {
                var that = this;

// TODO: allow custom scissor test.  Custom viewport?
// TODO: allow stencil, e.g., to run toon shader on a particular model?
// TODO: render to framebuffer and ping-pong
                command = new DrawCommand();
                command.primitiveType = PrimitiveType.TRIANGLE_FAN;
                command.vertexArray = getVertexArray(context);
                command.renderState = context.createRenderState({
                    blending : BlendingState.ALPHA_BLEND,
                });
                command.uniformMap = {
// TODO: use semantics in Touch Up to access color/depth textures
                    czm_color : function() {
                        return that._colorTexture;
                    },
                    czm_glow : function() {
                        return that._glowTexture;
                    },
                    u_postprocessColorStep : function() {
                        return that._colorStep;
                    }
                };

                this._command = command;
            }

            var length = filters.length;
            for (var i = 0; i < length; ++i) {
                filters[i].update(context);
            }
        }
    };

    PostProcessEngine.prototype.executeCommands = function(context, passState, filters) {
        var command = this._command;

        var length = filters.length;
        for (var i = 0; i < length; ++i) {
            var filter = filters[i];
            command.shaderProgram = filter.shaderProgram;
            command.execute(context, passState);
        }
    };

// TODO: expose this through scene
    PostProcessEngine.prototype.freeResources = function() {
        this._colorTexture = this._colorTexture && this._colorTexture.destroy();
        this._glowTexture = this._glowTexture && this._glowTexture.destroy();
        this._depthTexture = this._depthTexture && this._depthTexture.destroy();
        this._depthRenderbuffer = this._depthRenderbuffer && this._depthRenderbuffer.destroy();

        this.framebuffer = this.framebuffer && this.framebuffer.destroy();
        this.glowFramebuffer = this.glowFramebuffer && this.glowFramebuffer.destroy();
    };

    PostProcessEngine.prototype.isDestroyed = function() {
        return false;
    };

    PostProcessEngine.prototype.destroy = function() {
        this.freeResources();
        return destroyObject(this);
    };

    return PostProcessEngine;
});
