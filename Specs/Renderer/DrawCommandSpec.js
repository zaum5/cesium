/*global defineSuite*/
defineSuite([
         'Renderer/DrawCommand'
     ], function(
         DrawCommand) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructs', function() {
        var c = new DrawCommand();
        expect(c.boundingVolume).toBeUndefined();
        expect(c.cull).toEqual(true);
        expect(c.modelMatrix).toBeUndefined();
        expect(c.offset).toBeUndefined();
        expect(c.count).toBeUndefined();
        expect(c.primitiveType).toBeUndefined();
        expect(c.renderState).toBeUndefined();
        expect(c.passCommand.shaderProgram).toBeUndefined();
        expect(c.passCommand.uniformMap).toBeUndefined();
        expect(c.vertexArray).toBeUndefined();
    });

});