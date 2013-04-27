(function ($) {

    var Video = function (options) {
            return new Video.Instance(options);
        },
        Canvas = function (options) {
            return new Canvas.Instance(options);
        },
        defaultOptions,
        methods,
        downloading,
        mainVideo,
        bufferVideo,
        DEBUG_MODE = true;

    function log(message) {
        if (DEBUG_MODE === true) {
            console.log('Meanwhile.js: ' + message);
        }
    }

    Video.STATUS_EMPTY = 'empty';
    Video.STATUS_DOWNLOADING = 'downloading';
    Video.STATUS_READY = 'ready';
    Video.STATUS_PLAYING = 'playing';
    Video.STATUS_PAUSED = 'paused';
    Video.STATUS_ENDED = 'ended';

    Video.Instance = function (options) {
        var self = this;

        this.options = {
            width: 480,
            height: 480,
            id: 'video'
        };

        if (options) {
            $.extend(this.options, options);
        }

        this.element = $('<video />');
        this.element
            .attr({
                'id': this.options.id,
                'preload': 'auto',
                'autobuffer': true
            })
            .css({
                'display': 'none'
            });

        this.video = this.element.get(0);

        this.status = Video.STATUS_EMPTY;

        return this;
    };

    Video.Instance.prototype = {
        drawOnCanvas: function (canvas) {
            canvas.draw(this);
        },

        load: function (sourceUrl, callback) {
            var self = this;

            log('loading ' + this.options.id);

            this.status = Video.STATUS_DOWNLOADING;

            $.ajax({
                url: sourceUrl + '?buffer=' + this.options.id,
                success: function (data) {

                    log('success!');

                    self.element.attr('src', self.options.id + '.mp4');
                    self.status = Video.STATUS_READY;

                    if (callback) {
                        callback();
                    }

                    self = null;
                }
            });
        },

        play: function (callback) {
            var self = this;
            this.status = Video.STATUS_PLAYING;
            this.video.play();

            this.element.bind("ended", function () {
                self.status = Video.STATUS_ENDED;
                self.element.unbind("ended");
                self = null;
                if (!!callback) {
                    callback();
                }
            });
        },

        restart: function () {
            this.element.unbind('ended');
            this.status = Video.STATUS_PAUSED;
            this.video.pause();
            this.video.currentTime = 0;
        },

        id: function () {
            return this.options.id;
        },

        width: function () {
            return this.options.width;
        },

        height: function () {
            return this.options.height;
        }
    };

    Canvas.Instance = function (options) {
        var self = this;

        this.options = {
            effect: 'colorChanging',
            effectOpacity: 1,
            cellsPerDimension: 4,
            width: 480,
            height: 480,
            palette: [
                [89, 79, 79],
                [84, 121, 128],
                [69, 173, 168],
                [157, 224, 173],
                [229, 252, 194]
            ]
        };

        if (options) {
            $.extend(this.options, options);
        }

        this.element = $('<canvas />');
        this.backCanvas = this.element.clone();

        this.element
            .css({
                'position': 'absolute',
                'top': 0,
                // Vertically center the square videos
                'margin-top': (($(window).height() - $(window).width()) / 2) + 'px',
                'left': 0,
                'width': '100%',
                'display': 'block'
            });

        this.element.get(0).width = this.options.width;
        this.element.get(0).height = this.options.height;
        this.backCanvas.get(0).width = this.options.width;
        this.backCanvas.get(0).height = this.options.height;

        this.context = this.element.get(0).getContext('2d');
        this.backContext = this.backCanvas.get(0).getContext('2d');
        this.timeout = undefined;

        return this;
    };

    Canvas.Instance.prototype = {
        draw: function (video) {
            this.recalculateEffectFactors(this.options.effect);
            Canvas.utils.drawOneVideo(this, video, this.context, this.backContext, this.options);
        },

        recalculateEffectFactors: function (effect) {
            switch (effect) {

            case 'colorChanging':
                Canvas.aux.rfactor = Canvas.utils.recalculateFactorArray(Canvas.aux.rfactor);
                Canvas.aux.gfactor = Canvas.utils.recalculateFactorArray(Canvas.aux.gfactor);
                Canvas.aux.bfactor = Canvas.utils.recalculateFactorArray(Canvas.aux.bfactor);
                break;

            case 'random':
                Canvas.aux.temp = [];

                for (Canvas.aux.i in Canvas.effects) {
                    if (Canvas.effects.hasOwnProperty(Canvas.aux.i) && Canvas.aux.i !== 'random'){
                        Canvas.aux.temp.push(Canvas.aux.i);                    
                    }
                }

                Canvas.aux.randomEffect = Canvas.aux.temp[Math.round(Math.random() * (Canvas.aux.temp.length - 1))];
                this.recalculateEffectFactors(Canvas.aux.randomEffect);

                break;

            }
        }
    };

    Canvas.utils = {
        findColorDifference: function (dif, dest, src) {
            return (dif * dest + (1 - dif) * src);
        },

        recalculateFactor: function (factor) {
            // return Math.max(0, Math.min(1, factor + factorVariance * (Math.random() - 0.5)));
            return Math.random();
        },

        recalculateFactorArray: function (f) {
            f[0] = Canvas.utils.recalculateFactor(f[0]);
            f[1] = Canvas.utils.recalculateFactor(f[1]);
            f[2] = Canvas.utils.recalculateFactor(f[2]);

            return f;
        },

        drawOneVideo: function (canvas, video, context, backContext, options) {
            if (!!canvas.timeout) {
                clearTimeout(canvas.timeout);
            }

            if (video.status === Video.STATUS_PAUSED || video.status === Video.STATUS_ENDED) {
                return false;
            }

            backContext.drawImage(video.video, 0, 0, options.width, options.height);
            Canvas.aux.idata = backContext.getImageData(0, 0, options.width, options.height);
            Canvas.aux.idata.data = Canvas.effects[options.effect](Canvas.aux.idata.data, canvas);

            context.putImageData(Canvas.aux.idata, 0, 0);
            // Start over!        
            canvas.timeout = setTimeout(Canvas.utils.drawOneVideo, 20, canvas, video, context, backContext, options);
        }
    };

    Canvas.aux = {
        i: 0,
        j: 0,
        k: 0,
        column: 0,
        row: 0,
        dataInRow: 0,
        r: 0,
        g: 0,
        b: 0,
        brightness: 0,
        data: null,
        idata: null,
        factorVariance: 0.4,
        rfactor: [0.5, 0.5, 0.5],
        gfactor: [0.5, 0.5, 0.5],
        bfactor: [0.5, 0.5, 0.5],
        temp: undefined,
        randomEffect: null,
    };

    Canvas.effects = {
        blackandwhite: function (data, canvas) {

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.r = data[Canvas.aux.i];
                Canvas.aux.g = data[Canvas.aux.i + 1];
                Canvas.aux.b = data[Canvas.aux.i + 2];

                Canvas.aux.brightness = (3 * Canvas.aux.r + 4 * Canvas.aux.g + Canvas.aux.b) >>> 3;
                Canvas.aux.brightness = Canvas.aux.brightness > 128 ? 255 : 0;

                data[Canvas.aux.i]     = Canvas.aux.brightness;
                data[Canvas.aux.i + 1] = Canvas.aux.brightness;
                data[Canvas.aux.i + 2] = Canvas.aux.brightness;
            }

            return data;
        },

        palette: function (data, canvas) {

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.r = data[Canvas.aux.i];
                Canvas.aux.g = data[Canvas.aux.i + 1];
                Canvas.aux.b = data[Canvas.aux.i + 2];

                Canvas.aux.brightness = (3 * Canvas.aux.r + 4 * Canvas.aux.g + Canvas.aux.b) >>> 3;

                Canvas.aux.j = Math.floor(Canvas.aux.brightness * canvas.options.palette.length / 256);

                data[Canvas.aux.i]     = canvas.options.palette[Canvas.aux.j][0];
                data[Canvas.aux.i + 1] = canvas.options.palette[Canvas.aux.j][1];
                data[Canvas.aux.i + 2] = canvas.options.palette[Canvas.aux.j][2];
            }

            return data;
        },

        grayscale: function (data, canvas) {

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.r = data[Canvas.aux.i];
                Canvas.aux.g = data[Canvas.aux.i + 1];
                Canvas.aux.b = data[Canvas.aux.i + 2];

                Canvas.aux.brightness = (3 * Canvas.aux.r + 4 * Canvas.aux.g + Canvas.aux.b) >>> 3;

                data[Canvas.aux.i]     = Canvas.aux.brightness;
                data[Canvas.aux.i + 1] = Canvas.aux.brightness;
                data[Canvas.aux.i + 2] = Canvas.aux.brightness;
            }

            return data;
        },

        sepia: function (data, canvas) {

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.r = data[Canvas.aux.i];
                Canvas.aux.g = data[Canvas.aux.i + 1];
                Canvas.aux.b = data[Canvas.aux.i + 2];

                data[Canvas.aux.i]     = Canvas.utils.findColorDifference(canvas.options.effectOpacity, (Canvas.aux.r * 0.393) + (Canvas.aux.g * 0.769) + (Canvas.aux.b * 0.189), Canvas.aux.r);
                data[Canvas.aux.i + 1] = Canvas.utils.findColorDifference(canvas.options.effectOpacity, (Canvas.aux.r * 0.349) + (Canvas.aux.g * 0.686) + (Canvas.aux.b * 0.168), Canvas.aux.g);
                data[Canvas.aux.i + 2] = Canvas.utils.findColorDifference(canvas.options.effectOpacity, (Canvas.aux.r * 0.272) + (Canvas.aux.g * 0.534) + (Canvas.aux.b * 0.131), Canvas.aux.b);
            }

            return data;
        },

        colorChanging: function (data, canvas) {

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.r = data[Canvas.aux.i];
                Canvas.aux.g = data[Canvas.aux.i + 1];
                Canvas.aux.b = data[Canvas.aux.i + 2];

                data[Canvas.aux.i]     = Canvas.utils.findColorDifference(canvas.options.effectOpacity, (Canvas.aux.r * Canvas.aux.rfactor[0]) + (Canvas.aux.g * Canvas.aux.rfactor[1]) + (Canvas.aux.b * Canvas.aux.rfactor[2]), Canvas.aux.r);
                data[Canvas.aux.i + 1] = Canvas.utils.findColorDifference(canvas.options.effectOpacity, (Canvas.aux.r * Canvas.aux.gfactor[0]) + (Canvas.aux.g * Canvas.aux.gfactor[1]) + (Canvas.aux.b * Canvas.aux.gfactor[2]), Canvas.aux.g);
                data[Canvas.aux.i + 2] = Canvas.utils.findColorDifference(canvas.options.effectOpacity, (Canvas.aux.r * Canvas.aux.bfactor[0]) + (Canvas.aux.g * Canvas.aux.bfactor[1]) + (Canvas.aux.b * Canvas.aux.bfactor[2]), Canvas.aux.b);
            }

            return data;

        },

        v_mirror: function (data, canvas) {

            Canvas.aux.dataInRow = canvas.options.width * 4;

            for (Canvas.aux.i = 0; Canvas.aux.i < (data.length / 2); Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.column = (Canvas.aux.i % (Canvas.aux.dataInRow / 2)) / 4;
                Canvas.aux.row = Math.floor(Canvas.aux.i / (Canvas.aux.dataInRow / 2));
                Canvas.aux.k = Canvas.aux.row * Canvas.aux.dataInRow + Canvas.aux.column * 4
                Canvas.aux.j = (Canvas.aux.row + 1) * Canvas.aux.dataInRow - (Canvas.aux.column * 4) - 4;
                data[Canvas.aux.j] = data[Canvas.aux.k];
                data[Canvas.aux.j + 1] = data[Canvas.aux.k + 1];
                data[Canvas.aux.j + 2] = data[Canvas.aux.k + 2];
            }

            return data;
        },

        h_mirror: function (data, canvas) {

            Canvas.aux.dataInRow = canvas.options.width * 4;

            for (Canvas.aux.i = 0; Canvas.aux.i < (data.length / 2); Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.column = (Canvas.aux.i % Canvas.aux.dataInRow) / 4;
                Canvas.aux.row = Math.floor(Canvas.aux.i / Canvas.aux.dataInRow);
                Canvas.aux.j = data.length - (Canvas.aux.row + 1) * Canvas.aux.dataInRow + Canvas.aux.column * 4;
                data[Canvas.aux.j] = data[Canvas.aux.i];
                data[Canvas.aux.j + 1] = data[Canvas.aux.i + 1];
                data[Canvas.aux.j + 2] = data[Canvas.aux.i + 2];
            }

            return data;
        },

        matrix: function (data, canvas) {

            Canvas.aux.data = [];
            Canvas.aux.dataInRow = canvas.options.width * 4;
            Canvas.aux.k = canvas.options.width / canvas.options.cellsPerDimension;

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                Canvas.aux.column = (Canvas.aux.i % Canvas.aux.dataInRow) / 4;
                Canvas.aux.row = Math.floor(Canvas.aux.i / Canvas.aux.dataInRow);
                Canvas.aux.j = canvas.options.cellsPerDimension * (Canvas.aux.column % (Canvas.aux.k)) * 4 + Canvas.aux.dataInRow * canvas.options.cellsPerDimension * (Canvas.aux.row % Canvas.aux.k);

                Canvas.aux.data[Canvas.aux.i] = data[Canvas.aux.j];
                Canvas.aux.data[Canvas.aux.i + 1] = data[Canvas.aux.j + 1];
                Canvas.aux.data[Canvas.aux.i + 2] = data[Canvas.aux.j + 2];
                Canvas.aux.data[Canvas.aux.i + 3] = data[Canvas.aux.j + 3];
            }

            // data is a readonly array, so we have to modify one cell each time
            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 1) {
                data[Canvas.aux.i] = Canvas.aux.data[Canvas.aux.i];
            }

            return data;
        },

        superpixel: function (data, canvas) {

            for (Canvas.aux.i = 0; Canvas.aux.i < data.length; Canvas.aux.i = Canvas.aux.i + 4) {
                
                Canvas.aux.j = Canvas.aux.i - Canvas.aux.i % 64;

                data[Canvas.aux.i] = data[Canvas.aux.j];
                data[Canvas.aux.i + 1] = data[Canvas.aux.j + 1];
                data[Canvas.aux.i + 2] = data[Canvas.aux.j + 2];
                data[Canvas.aux.i + 3] = data[Canvas.aux.j + 3];
            }

            return data;
        },

        random: function (data, canvas) {
            Canvas.effects[Canvas.aux.randomEffect](data, canvas);
        }
    };

    function videoLoop(sourceUrl, video1, video2, canvas) {
        log('showing ' + video1.id());

        downloading = video1.status === Video.STATUS_DOWNLOADING;

        if (downloading) {
            log('\twait! it\'s still downloading');
        }
        mainVideo = downloading ? video2 : video1;
        bufferVideo = downloading ? video1 : video2;

        if (downloading) {
            mainVideo.restart();
        }

        log('playing ' + mainVideo.id());

        mainVideo.play(function () {
            log(mainVideo.id() + ' ended');
            videoLoop(sourceUrl, bufferVideo, mainVideo, canvas);
        });
        canvas.draw(mainVideo);

        if (!downloading) {
            bufferVideo.load(sourceUrl);
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
                    video1 = new Video({
                        id: 'video_1'
                    }),
                    video2 = new Video({
                        id: 'video_2'
                    }),
                    canvas = new Canvas({
                        effect: 'palette'
                    });

                $this.append(video1.element).append(video2.element).append(canvas.element);

                video1.load(options.sourceUrl, function () {
                    videoLoop(options.sourceUrl, video1, video2, canvas);
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