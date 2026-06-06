/**
 * Photo Finish — mapping temps <-> position image (bandeaux).
 */
var assert = require("assert");

function imageXToTime(strips, imageX) {
  if (!strips.length) return 0;
  var x = Math.max(0, Math.min(imageX, strips[strips.length - 1].imageXEnd));
  var low = 0;
  var high = strips.length - 1;
  while (low <= high) {
    var mid = Math.floor((low + high) / 2);
    var strip = strips[mid];
    if (x < strip.imageXStart) high = mid - 1;
    else if (x >= strip.imageXEnd) low = mid + 1;
    else return strip.elapsedTimeMs;
  }
  return strips[strips.length - 1].elapsedTimeMs;
}

function timeToImageX(strips, timeMs) {
  if (!strips.length) return 0;
  var t = Math.max(0, timeMs);
  for (var i = 0; i < strips.length; i++) {
    var strip = strips[i];
    var next = strips[i + 1];
    if (!next || t < next.elapsedTimeMs) {
      return strip.imageXStart + strip.width * 0.5;
    }
  }
  var last = strips[strips.length - 1];
  return last.imageXStart + last.width * 0.5;
}

function makeStrip(index, elapsedTimeMs, width) {
  var imageXStart = index * width;
  return {
    elapsedTimeMs: elapsedTimeMs,
    imageXStart: imageXStart,
    imageXEnd: imageXStart + width,
    width: width,
  };
}

(function testConstantTimeWithinStrip() {
  var strips = [makeStrip(0, 100, 4), makeStrip(1, 116, 4), makeStrip(2, 132, 4)];
  assert.strictEqual(imageXToTime(strips, 0), 100);
  assert.strictEqual(imageXToTime(strips, 1), 100);
  assert.strictEqual(imageXToTime(strips, 3.9), 100);
  assert.strictEqual(imageXToTime(strips, 4), 116);
})();

(function testNoTemporalStretchAcrossStripWidth() {
  var strips = [makeStrip(0, 0, 4), makeStrip(1, 16, 4)];
  var oldInterpolated = 0 + (16 - 0) * (3 / 4);
  assert.notStrictEqual(imageXToTime(strips, 3), oldInterpolated);
  assert.strictEqual(imageXToTime(strips, 3), 0);
})();

(function testRoundTripByStripCenter() {
  var strips = [];
  for (var i = 0; i < 10; i++) strips.push(makeStrip(i, i * 16, 4));
  strips.forEach(function (strip) {
    var x = timeToImageX(strips, strip.elapsedTimeMs);
    assert.strictEqual(imageXToTime(strips, x), strip.elapsedTimeMs);
  });
})();

console.log("photo-finish-timing.test.js OK");
