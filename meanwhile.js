(function ($) {

    var defaultOptions,
        $videoBuffer,
        methods,
        downloadingVideo = [],
        downloading,
        i,
        r,
        g,
        b,
        factorVariance = 0.4,
        rfactor = [0.5, 0.5, 0.5],
        gfactor = [0.5, 0.5, 0.5],
        bfactor = [0.5, 0.5, 0.5],
        idata,
        brightness,
        sepiaOpacity = 1,
        effects = {},
        idBuffer1,
        idBuffer2,
        video,
        canvas,
        context,
        backCanvas,
        backContext,
        elementAux,
        bufferAux,
        drawTimeout;

    function findColorDifference(dif, dest, src) {
        return (dif * dest + (1 - dif) * src);
    }

    function recalculateFactor(factor) {
        // return Math.max(0, Math.min(1, factor + factorVariance * (Math.random() - 0.5)));
        return Math.random();
    }

    function recalculateArray(f) {
        f[0] = recalculateFactor(f[0]);
        f[1] = recalculateFactor(f[1]);
        f[2] = recalculateFactor(f[2]);

        return f;
    }

    effects.bw = function (data) {

        for (i = 0; i < data.length; i = i + 4) {
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];
            brightness = (3 * r + 4 * g + b) >>> 3;
            data[i] = brightness;
            data[i + 1] = brightness;
            data[i + 2] = brightness;
        }

        return data;
    };

    effects.sepia = function (data) {

        for (i = 0; i < data.length; i = i + 4) {
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];

            data[i] = findColorDifference(sepiaOpacity, (r * 0.393) + (g * 0.769) + (b * 0.189), r);
            data[i + 1] = findColorDifference(sepiaOpacity, (r * 0.349) + (g * 0.686) + (b * 0.168), g);
            data[i + 2] = findColorDifference(sepiaOpacity, (r * 0.272) + (g * 0.534) + (b * 0.131), b);
        }

        return data;
    };


    effects.changing = function (data) {

        for (i = 0; i < data.length; i = i + 4) {
            r = data[i];
            g = data[i + 1];
            b = data[i + 2];

            data[i] = findColorDifference(sepiaOpacity, (r * rfactor[0]) + (g * rfactor[1]) + (b * rfactor[2]), r);
            data[i + 1] = findColorDifference(sepiaOpacity, (r * gfactor[0]) + (g * gfactor[1]) + (b * gfactor[2]), g);
            data[i + 2] = findColorDifference(sepiaOpacity, (r * bfactor[0]) + (g * bfactor[1]) + (b * bfactor[2]), b);
        }

        return data;
    };

    function draw(video, context, backContext, width, height) {
        if (!!drawTimeout) {
            clearTimeout(drawTimeout);
        }

        if (video.paused || video.ended) { return false; }

        backContext.drawImage(video, 0, 0, width, height);

        idata = backContext.getImageData(0, 0, width, height);
        idata.data = effects.changing(idata.data);

        context.putImageData(idata, 0, 0);
        // Start over!        
        drawTimeout = setTimeout(draw, 20, video, context, backContext, width, height);
    }

    function loadVideo(sourceUrl, video, callback) {
        idBuffer1 = video.attr('id');

        console.log('loading...');

        downloadingVideo[idBuffer1] = true;

        $.ajax({
            url: sourceUrl + '?buffer=' + idBuffer1,
            success: function (data) {

                console.log('success!');

                video.attr('src', idBuffer1 + '.mp4');

                downloadingVideo[idBuffer1] = false;

                if (callback) {
                    callback();
                }
            }
        });
    }

    function populateVideo(sourceUrl, video) {
        // window.setTimeout(function () {
        loadVideo(sourceUrl, video);
        // }, 2000);
    }

    function showVideo(sourceUrl, $element, $buffer, $canvas, $backCanvas) {
        console.log('showing...');

        downloading = downloadingVideo[$element.attr('id')];
        if (downloading) {
            console.log('wait! it\'s still downloading');
        }
        elementAux = downloading ? $buffer : $element;
        bufferAux = downloading ? $element : $buffer;

        idBuffer2 = elementAux.attr('id');
        video = elementAux.get(0);
        canvas = $canvas.get(0);
        context = canvas.getContext('2d');
        backCanvas = $backCanvas.get(0);
        backContext = backCanvas.getContext('2d');

        canvas.width = 480;
        canvas.height = 480;

        backCanvas.width = canvas.width;
        backCanvas.height = canvas.height;

        rfactor = recalculateArray(rfactor);
        gfactor = recalculateArray(gfactor);
        bfactor = recalculateArray(bfactor);

        console.log('playing ' + idBuffer2);

        if (downloading) {
            elementAux.unbind('ended');
            video.pause();
            video.currentTime = 0;
        }

        video.play();
        draw(video, context, backContext, canvas.width, canvas.height);

        elementAux.bind("ended", function () {
            elementAux.unbind("ended");
            console.log(idBuffer2 + ' ended');
            showVideo(sourceUrl, bufferAux, elementAux, $canvas, $backCanvas);
        });

        if (!downloading) {
            populateVideo(sourceUrl, bufferAux);
        }

    }

    defaultOptions = {
        sourceUrl: null
    };
    methods = {
        init: function (options) {
            var that = this;

            if (options) {
                $.extend(defaultOptions, options);
            }

            return this.each(function () {
                var $this = $(this),
                    $video = $('<video>'),
                    $canvas = $('<canvas/>'),
                    $backCanvas = $('<canvas/>');

                $video
                    .css({
                        'display': 'none'
                    })
                    .attr({
                        'id': 'buffer_1',
                        'preload': 'auto',
                        'autobuffer': true
                    });

                $canvas
                    .css({
                        'position': 'absolute',
                        'top': 0,
                        'left': 0,
                        'display': 'block',
                        'width': '100%'
                    });

                $videoBuffer = $video.clone();
                $videoBuffer.attr('id', 'buffer_2');

                downloadingVideo[$video.attr('id')] = false;
                downloadingVideo[$videoBuffer.attr('id')] = false;

                $this.append($video).append($videoBuffer).append($canvas);

                loadVideo(options.sourceUrl, $video, function () {
                    showVideo(options.sourceUrl, $video, $videoBuffer, $canvas, $backCanvas);
                });
            });
        }
    };

    $.fn.meanwhile = function (method) {

        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }

        if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }

        $.error('Method ' +  method + ' does not exist on jQuery.meanwhile');
    };

}(jQuery));