/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    var GeometryBatchType = {
        COLOR : new Enumeration(0, 'COLOR'),
        POLYLINE_COLOR : new Enumeration(1, 'POLYLINE_COLOR'),
        MATERIAL : new Enumeration(2, 'MATERIAL'),
        POLYLINE_MATERIAL : new Enumeration(3, 'POLYLINE_MATERIAL'),
        DYNAMIC : new Enumeration(4, 'DYNAMIC'),
        NONE : new Enumeration(5, 'NONE')
    };

    return GeometryBatchType;
});
