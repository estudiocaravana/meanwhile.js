(function ($) {
    'use strict';

    function setVideo(element, videoJSON) {
        if (videoJSON && videoJSON.video_url !== undefined) {
            element.attr('src', videoJSON.video_url);
        }

        return false;
    }

    function loadVideo(sourceUrl, video, callback) {
        $.ajax({
            url: sourceUrl
        }).done(function (data) {
            setVideo(video, data);

            if (callback) {
                callback();
            }
        });
    }

    function populateVideo(sourceUrl, video) {
        // window.setTimeout(function () {
        loadVideo(sourceUrl, video);
        // }, 2000);
    }

    function showVideo(sourceUrl, element, buffer) {
        buffer.hide();

        element.show().get(0).play();
        element.bind("ended", function () {
            showVideo(sourceUrl, buffer, element);
        });

        populateVideo(sourceUrl, buffer);
    }

    var defaultOptions = {
            sourceUrl: null
        },
        videoQueue,
        $videoBuffer,
        methods = {
            init: function (options) {
                var that = this;

                if (options) {
                    $.extend(defaultOptions, options);
                }

                return this.each(function () {
                    var $this = $(this),
                        $video = $('<video>');

                    $video
                        .css({
                            'position': 'absolute',
                            'top': 0,
                            'left': 0,
                            'display': 'none',
                            'width': '100%'
                        })
                        .attr({
                            'preload': 'auto',
                            'autobuffer': true
                        });

                    $videoBuffer = $video.clone();

                    $this.append($video).append($videoBuffer);

                    loadVideo(options.sourceUrl, $video, function () {
                        showVideo(options.sourceUrl, $video, $videoBuffer);
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