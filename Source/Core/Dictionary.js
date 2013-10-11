/*global define*/
define(['./defined',
        './DeveloperError'
    ], function(
        defined, DeveloperError) {
    "use strict";

    var Dictionary = function() {
        this._array = [];
        this._hash = {};
    };

    Dictionary.prototype.getValues = function() {
        return this._array;
    };

    Dictionary.prototype.add = function(key, value) {
        this._hash[key] = value;
        this._array.push(value);
    };

    Dictionary.prototype.getValue = function(key) {
        return this._hash[key];
    };

    Dictionary.prototype.remove = function(key) {
        var hasValue = defined(this._hash[key]);
        if (hasValue) {
            var array = this._array;
            array.splice(array.indexOf(this._hash[key]), 1);
            this._hash[key] = undefined;
        }
        return hasValue;
    };

    Dictionary.prototype.removeAll = function() {
        this._hash = {};
        this._array.length = 0;
    };

    return Dictionary;
});
