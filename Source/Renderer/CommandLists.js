/*global define*/
define(function() {
    "use strict";

// TODO: delete this files and its specs

    /**
     * Represents lists of commands for drawing for each render pass.
     *
     * @alias CommandLists
     * @constructor
     */
    var CommandLists = function() {
        /**
         * The command list for the color pass.
         *
         * @type Array
         */
        this.colorList = [];

        /**
         * The command list for the glow pass.
         *
         * @type Array
         */
        this.glowList = [];

        /**
         * The command list for the pick pass.
         *
         * @type Array
         */
        this.pickList = [];

        /**
         * The command list for the overlay pass.
         *
         * @type Array
         */
        this.overlayList = [];
    };

    CommandLists.prototype.empty = function() {
        return (this.colorList.length === 0 &&
                this.glowList.length === 0 &&
                this.pickList.length === 0 &&
                this.overlayList.length === 0);
    };

    CommandLists.prototype.removeAll = function() {
        this.colorList.length = 0;
        this.glowList.length = 0;
        this.pickList.length = 0;
        this.overlayList.length = 0;
    };

    return CommandLists;
});