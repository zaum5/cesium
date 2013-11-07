/*global define*/
define([
        '../Core/Cartesian2',
        '../Core/defined',
        './ConstantProperty',
        './Property'
    ], function(
        Cartesian2,
        defined,
        ConstantProperty,
        Property) {
    "use strict";

    function createSeekFunction(that, context, video, result) {
        return function() {
            //            console.log("seek called");
            //            if (video.seekable.length === 0) {
            //                console.log(video.seekable);
            //            } else {
            //                for ( var i = 0; i < video.seekable.length; i++) {
            //                    console.log(video.seekable.start(i));
            //                    console.log(video.seekable.end(i));
            //                }
            //            }

            if (typeof that._cached_texture === 'undefined') {
                that._cached_texture = context.createTexture2D({
                    source : video
                });
                result.image = that._cached_texture;
            }

            that._cached_texture.copyFrom(video);
            var duration = video.duration;
            //TODO: We should probably be checking the video.seekable segments
            //before setting the currentTime, but if there are no seekable
            //segments, then this code will have no affect, so the net result
            //seems to be the same.
            var videoTime = that._cached_startTime.getSecondsDifference(that._cached_time);
            videoTime = videoTime * that._cached_speed;
            if (that._cached_loop) {
                videoTime = videoTime % duration;
                if (videoTime < 0.0) {
                    videoTime = duration - videoTime;
                }
                video.currentTime = videoTime;
            } else if (videoTime > duration) {
                video.currentTime = duration;
            } else if (videoTime < 0.0) {
                video.currentTime = 0.0;
            } else {
                video.currentTime = videoTime;
            }
        };
    }

    /**
     * A {@link MaterialProperty} that maps to image {@link Material} uniforms.
     * @alias VideoMaterialProperty
     * @constructor
     */
    var VideoMaterialProperty = function() {
        /**
         * A string {@link Property} which is the url of the desired video.
         * @type {Property}
         */
        this.video = undefined;
        /**
         * A {@link Cartesian2} {@link Property} which determines the number of times the video repeats in each direction.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1, 1))
         */
        this.repeat = new ConstantProperty(new Cartesian2(1, 1));

        this.startTime = undefined;
        this.loop = undefined;
        this.speed = undefined;
    };

    /**
     * Gets the {@link Material} type at the provided time.
     * @memberof VideoMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @type {String} The type of material.
     */
    VideoMaterialProperty.prototype.getType = function(time) {
        return 'Image';
    };

    /**
     * Gets the value of the property at the provided time.
     * @memberof VideoMaterialProperty
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     *
     * @exception {DeveloperError} time is required.
     */
    VideoMaterialProperty.prototype.getValue = function(time, result, context) {
        if (!defined(result)) {
            result = {};
        }

        result.image = defined(this.image) ? this.image.getValue(time) : undefined;
        result.repeat = defined(this.repeat) ? this.repeat.getValue(time, result.repeat) : undefined;

        var loop = false;
        var property = this.loop;
        if (typeof property !== 'undefined') {
            loop = property.getValue(time);
        }

        var speed = 1;
        property = this.speed;
        if (typeof property !== 'undefined') {
            speed = property.getValue(time);
        }

        this._cached_speed = speed;
        this._cached_loop = loop;
        this._cached_time = time;

        property = this.startTime;
        if (typeof property !== 'undefined') {
            this._cached_startTime = property.getValue(time, this._startTime);
        }

        var video;
        property = this.video;
        if (typeof property !== 'undefined') {
            var url = property.getValue(time);
            if (typeof url !== 'undefined' && this._cached_currentUrl !== url) {
                this._cached_currentUrl = url;
                if (typeof this._cached_video !== 'undefined') {
                    this._cached_video.removeEventListener("seeked", this._seekFunction, false);
                    document.body.removeChild(this._cached_video);
                }
                video = this._cached_video = document.createElement('video');
                document.body.appendChild(video);
                video.style.display = 'none';
                video.preload = 'auto';
                var that = this;
                video.addEventListener("loadeddata", function() {
                    //console.log("load event fired");
                    that._seekFunction = createSeekFunction(that, context, video, result);
                    video.addEventListener("seeked", that._seekFunction, false);
                    that._seekFunction();
                }, false);

                video.src = url;
                video.load();
            }
        }

        return result;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     * @memberof VideoMaterialProperty
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    VideoMaterialProperty.prototype.equals = function(other) {
        return this === other || //
                (other instanceof VideoMaterialProperty && //
                Property.equals(this.image, other.image) && //
                Property.equals(this.repeat, other.repeat));
    };

    return VideoMaterialProperty;
});
