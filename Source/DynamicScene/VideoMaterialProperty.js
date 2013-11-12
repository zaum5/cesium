/*global define*/
define(['../Core/Iso8601',
        '../Core/Cartesian2',
        '../Core/defined',
        './ConstantProperty',
        './Property'
    ], function(
        Iso8601,
        Cartesian2,
        defined,
        ConstantProperty,
        Property) {
    "use strict";

    function createSeekFunction(that, context, video, result) {
        return function() {
            if (!defined(that._texture)) {
                that._texture = context.createTexture2D({
                    source : video
                });
                result.image = that._texture;
            }

            that._texture.copyFrom(video);
            var duration = video.duration;
            //TODO: We should probably be checking the video.seekable segments
            //before setting the currentTime, but if there are no seekable
            //segments, then this code will have no affect, so the net result
            //seems to be the same.
            var videoTime = that._startTime.getSecondsDifference(that._time);
            videoTime = videoTime * that._speed;
            if (that._loop) {
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

        /**
         * A {@link JulianDate} {@link Property} which determines the simulation start time of the video.
         * @type {Property}
         * @default new ConstantProperty(new Cartesian2(1, 1))
         */
        this.startTime = new ConstantProperty(Iso8601.MININMUM_VALUE);

        /**
         * A Boolean {@link Property} which determines whether or not the video should loop;
         * @type {Property}
         * @default new ConstantProperty(true)
         */
        this.loop = new ConstantProperty(true);

        /**
         * A Number {@link Property} which determines the playback speed of the video.
         * @type {Property}
         * @default new ConstantProperty(true)
         */
        this.speed = new ConstantProperty(1.0);

        this._time = undefined;
        this._speed = undefined;
        this._loop = undefined;
        this._startTime = undefined;
        this._videoUrl = undefined;
        this._videoElement = undefined;
        this._seekFunction = undefined;
        this._texture = undefined;
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

        result.repeat = defined(this.repeat) ? this.repeat.getValue(time, result.repeat) : undefined;
        this._time = time;
        this._speed = defined(this.speed) ? this.speed.getValue(time) : 1;
        this._loop = defined(this.loop) ? this.loop.getValue(time) : true;
        this._startTime = defined(this.startTime) ? this.startTime.getValue(time) : Iso8601.MININMUM_VALUE;

        var videoProperty = this.video;
        if (defined(videoProperty)) {
            var url = videoProperty.getValue(time);
            if (defined(url) && this._videoUrl !== url) {
                this._videoUrl = url;
                if (defined(this._videoElement)) {
                    this._videoElement.removeEventListener("seeked", this._seekFunction, false);
                    document.body.removeChild(this._videoElement);
                }
                var video = document.createElement('video');
                video.style.display = 'none';
                video.preload = 'auto';
                document.body.appendChild(video);
                this._videoElement = video;

                var that = this;
                video.addEventListener("loadeddata", function() {
                    var seekFunction = createSeekFunction(that, context, video, result);
                    that._seekFunction = seekFunction;
                    video.addEventListener("seeked", that._seekFunction, false);
                    seekFunction();
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
                Property.equals(this.video, other.video) && //
                Property.equals(this.startTime, other.startTime) && //
                Property.equals(this.loop, other.loop) && //
                Property.equals(this.speed, other.speed) && //
                Property.equals(this.repeat, other.repeat));
    };

    return VideoMaterialProperty;
});
