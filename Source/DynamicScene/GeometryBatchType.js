/*global define*/
define(['../Core/Enumeration'], function(Enumeration) {
    "use strict";

    var GeometryBatchType = {
        COLOR : new Enumeration(0, 'COLOR'),
        POLYLINE_COLOR : new Enumeration(1, 'POLYLINE_COLOR'),
        MATERIAL : new Enumeration(2, 'MATERIAL'),
        POLYLINE_MATERIAL : new Enumeration(3, 'POLYLINE_MATERIAL'),
        DYNAMIC : new Enumeration(4, 'DYNAMIC'),
        OUTLINE : new Enumeration(5, 'OUTLINE'),
        NONE : new Enumeration(6, 'NONE')
    };

    return GeometryBatchType;
});
