require('./bootstrap');

(function ( $ ) {

    $.fn.snazzyvideo = function(config = {}, markers = []) {
        new VideoObject(this, config, markers).renderObject();
        return this;
    };

}( jQuery ));

class VideoObject {
    constructor(DomObject, config, markers) {
        this.OriginalDomObject = DomObject;
        this.DomObject = this.OriginalDomObject.clone();
        this.config = $.extend({
            autoplay: false,
            airplay: false,
            debug: false,
        }, config);
        this.markers = $.extend([], markers);

        this.duration = 0;
        this.currentTime = 0;

        this.wrapper = $(this.wrapperContainer());
    }

    debug() {
        return this.config.debug;
    }

    init() {
        this.DomObject.removeAttr('controls');
        this.DomObject.removeAttr('autoplay');
        this.DomObject.removeAttr('loop');
        this.DomObject.attr('allowfullscreen', 'allowfullscreen');

        this.currentTime = this.DomObject[0].currentTime;
        this.duration = this.DomObject[0].duration;

        return this;
    }

    markerTemplate(label) {
        let template = `<div class="snazzyvideo-seeker-marker">
                            <div class="snazzyvideo-seeker-marker-label">
                                <span>` + label + `</span>
                            </div>
                        </div>`;

        return template;
    }

    wrapperContainer() {
        return `<div class="snazzyvideo-container">
            <div class="snazzyvideo-element-wrapper">
                <div class="snazzyvideo-element-overlay">
                    <button class="snazzyvideo-button snazzyvideo-play" role="playPauseButton"></button>
                </div>
            </div>
            <div class="snazzyvideo-controls">
                <button class="snazzyvideo-volume"></button>
                <button class="snazzyvideo-cc"></button>
                <div class="snazzyvideo-time-indicator snazzyvideo-current-time">
                    <span></span>
                </div>
                <div class="snazzyvideo-seeker">
                    <div class="snazzyvideo-seeker-track">
                        <div class="snazzyvideo-seeker-position">
                            <div class="snazzyvideo-seeker-position-label">
                                <span>00:00:00</span>
                            </div>
                        </div>
                        <div class="snazzyvideo-seeker-current-position"></div>
                    </div>
                </div>
                <div class="snazzyvideo-time-indicator snazzyvideo-total-time">
                    <span></span>
                </div>
                <button class="snazzyvideo-airplay"></button>
                <button class="snazzyvideo-mirror"></button>
                <button class="snazzyvideo-fullscreen"></button>
            </div>
        </div>`;
    }

    formatTime(time) {
        var hrs = ~~(time / 3600);
        var mins = ~~((time % 3600) / 60);
        var secs = ~~time % 60;

        var ret = "";
        if (hrs > 0) {
            ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
        } else {
            ret += (mins < 10 ? "0" : "");
        }
        ret += "" + mins + ":" + (secs < 10 ? "0" : "");
        ret += "" + secs;
        return ret;
    }

    addVideoElementIntoWrapper() {
        if(! this.DomObject.hasClass(VideoObjectClasses.getBaseClass())) {
            this.DomObject.addClass(VideoObjectClasses.getBaseClass())
        }

        this.wrapper.find('.' + VideoObjectClasses.getElementWrapperClass()).prepend(this.DomObject);
        this.wrapper.addClass(VideoObjectClasses.getVideoPausedClass());

        return this;
    }

    setTimestamps() {
        let duration = this.duration = parseFloat(this.DomObject[0].duration);
        let currentTime = this.currentTime = parseFloat(this.DomObject[0].currentTime);

        if(this.debug()) {
            console.debug("Current time container", this.wrapper.find('.snazzyvideo-total-time > span'));
            console.debug("Video current time", currentTime);
        }

        // Update the length of the video in the wrapper
        this.wrapper.find('.snazzyvideo-total-time > span').text(this.formatTime(duration));
        // Update the length of the video in the wrapper
        this.wrapper.find('.snazzyvideo-current-time > span').text(this.formatTime(currentTime));

        return this;
    }

    registerPlayPauseEvent() {
        let playPauseButton = this.wrapper.find('[role="playPauseButton"]');

        if(this.config.debug) { console.debug("Registering click event for play/pause button", playPauseButton); }

        playPauseButton.on('click', event => {
            let target = $(event.target);

            if(target.hasClass(VideoObjectClasses.getPlayButtonClass())) {
                if(this.debug()) { console.info("Play event fired", this.DomObject); }
                this.DomObject[0].play();
                target.removeClass(VideoObjectClasses.getPlayButtonClass()).addClass(VideoObjectClasses.getPauseButtonClass());
                this.wrapper.removeClass(VideoObjectClasses.getVideoPausedClass());
                return true;
            }

            if(target.hasClass(VideoObjectClasses.getPauseButtonClass())) {
                if(this.debug()) { console.info("Pause event fired", this.DomObject); }
                this.DomObject[0].pause();
                playPauseButton.removeClass(VideoObjectClasses.getPauseButtonClass()).addClass(VideoObjectClasses.getPlayButtonClass());
                return false;
            }
        });

        return this;
    }

    registerTimeChangeEvent() {
        let updateCurrentTimeStamp = () => {
            let currentTime = this.currentTime = this.DomObject[0].currentTime;
            this.wrapper.find('.snazzyvideo-current-time > span').text(this.formatTime(currentTime));
        };

        let updateDurationTimeStamp = () => {
            let duration = this.duration = parseFloat(this.DomObject[0].duration);
            this.wrapper.find('.snazzyvideo-total-time > span').text(this.formatTime(duration));

            this.addMarkers();
        };

        let updateSeekerPosition = () => {
            let currentTime = this.currentTime = parseFloat(this.DomObject[0].currentTime);
            let duration = this.DomObject[0].duration;
            let percentPlayed = ((currentTime / duration) * 100) + '%';
            this.wrapper.find('.snazzyvideo-seeker-current-position').css('left', percentPlayed);
        };

        this.DomObject.on('timeupdate', updateCurrentTimeStamp);
        this.DomObject.on('timeupdate', updateSeekerPosition);

        this.DomObject.on('loadedmetadata', updateDurationTimeStamp);

        return this;
    }

    checkAirPlaySupport() {
        let WebKitPlaybackTargetAvailabilityEvent = window.WebKitPlaybackTargetAvailabilityEvent;

        if(this.debug()) { console.info("Airplay support", WebKitPlaybackTargetAvailabilityEvent); }

        if (WebKitPlaybackTargetAvailabilityEvent) {
            if(this.debug()) { console.info("AirPlay support detected"); }
            // let _this = this;

            this.DomObject.on('webkitplaybacktargetavailabilitychanged', (event) => {
                if(this.debug()) { console.info("AirPlay [webkitplaybacktargetavailabilitychanged] event", event); }

                switch (event.originalEvent.availability) {
                    case "available":
                        this.wrapper.find('.' + VideoObjectClasses.getAirPlayTargetPickerClass()).css('display', 'flex');
                        break;

                    default:
                        this.wrapper.find('.' + VideoObjectClasses.getAirPlayTargetPickerClass()).css('display', 'none');
                }
            });
        } else {
            if(this.debug()) { console.error("AirPlay is not supported in this browser"); }
            this.wrapper.find('.' + VideoObjectClasses.getAirPlayTargetPickerClass()).css('display', 'none');
        }

        return this;
    }

    registerAirPlayTargetPickerClickEvent() {
        if (!window.WebKitPlaybackTargetAvailabilityEvent)
            return;

        if(this.debug()) { console.info("Registered click event for AirPlay target selector"); }

        this.wrapper.find('.' + VideoObjectClasses.getAirPlayTargetPickerClass()).on('click', (event) => {
            event.preventDefault();
            this.DomObject[0].webkitShowPlaybackTargetPicker();
        });

        return this;
    }

    registerSeekEvent() {
        let seekerTrack = this.wrapper.find('.' + VideoObjectClasses.getSeekerTrackClass());
        let seekerPosition = this.wrapper.find('.' + VideoObjectClasses.getSeekerPositionClass());
        let seekerCurrentPositionMarker = this.wrapper.find('.' + VideoObjectClasses.getSeekerCurrentPositionMaker());
        let seekerPositionLabel = this.wrapper.find('.' + VideoObjectClasses.getSeekerPositionLabelClass() + ' > span');

        seekerTrack.on('mouseleave', function (event) { hidePotentialTracker(); });
        seekerTrack.on('mouseenter', function (event) { showPotentialTracker() });
        seekerTrack.on('mousemove', function (event) { updatePotentialTracker(event.pageX); });
        seekerTrack.on('click', function (event) { updateTracker(event.pageX); });

        let showPotentialTracker = () => {
            seekerPosition.addClass('snazzyvideo-seeker-position-active');
        };

        let hidePotentialTracker = () => {
            seekerPosition
                .removeClass('snazzyvideo-seeker-position-active');
        };

        let updatePotentialTracker = (pageX) => {
            let position = pageX - seekerTrack.offset().left;
            let percentage = 100 * position / seekerTrack.width();

            if(percentage > 100) { percentage = 100; }
            if(percentage < 0) {  percentage = 0; }

            seekerPosition.css({
                left: percentage + '%'
            });
            seekerPositionLabel.text(this.formatTime(this.duration * percentage / 100));
        };

        let updateTracker = (pageX) => {
            let position = pageX - seekerTrack.offset().left; - (seekerCurrentPositionMarker.width() / 2); // Position that has been clicked.
            let percentage = 100 * position / seekerTrack.width();
            let leftPercentage = 100 * (position - seekerCurrentPositionMarker.width() / 2) / seekerTrack.width();

            // Make sure that the seek position that has been clicked is within range.
            if(percentage > 100) { percentage = 100; }
            if(percentage < 0) {  percentage = 0; }

            seekerCurrentPositionMarker.css('left', leftPercentage + '%');
            this.DomObject[0].currentTime = this.duration * percentage / 100;
        };

        return this;
    }

    checkPipSupprt() {
        let pipButton = this.wrapper.find('.' + VideoObjectClasses.getPipTargetPickerClass());

        if(this.DomObject[0].webkitSupportsPresentationMode && typeof this.DomObject[0].webkitSetPresentationMode === 'function') {
            if(this.debug()) { console.info("PIP support detected"); }

            pipButton.on('click', event => {
                this.DomObject[0].webkitSetPresentationMode(this.DomObject[0].webkitPresentationMode === "picture-in-picture" ? "inline" : "picture-in-picture");
            });
            if(this.debug()) { console.info("Registered click event for PIP target selector"); }
        } else {
            if(this.debug()) { console.error("PIP is not supported in this browser"); }
            pipButton.css('display', 'none');
        }

        return this;
    }

    registerFullScreenClickEvent() {
        let fullScreenButton = this.wrapper.find('.' + VideoObjectClasses.getFullScreenClass());

        fullScreenButton.on('click', event => {
            let DomObject = this.DomObject[0];

            if (DomObject.requestFullscreen) {
                DomObject.requestFullscreen();
            } else if (DomObject.mozRequestFullScreen) {
                DomObject.mozRequestFullScreen();
            } else if (DomObject.webkitRequestFullscreen) {
                DomObject.webkitRequestFullscreen();
            } else if (DomObject.msRequestFullscreen) {
                DomObject.msRequestFullscreen();
            }
        });

        return this;
    }

    addMarkers() {
       if(this.debug()) { console.info("Adding markers", this.markers); }

       let markerContainer = this.wrapper.find('.' + VideoObjectClasses.getSeekerTrackClass());
       let duration = this.duration = this.DomObject[0].duration;

        $.each(this.markers, (index, marker) => {
            if (this.debug()) {
                console.info("Adding marker", marker);
            }

            let percent = (marker.time / duration) * 100;

            if (this.debug()) {
                console.info("Marker [" + marker.label + "] position", percent + '%');
            }

            let markerItem = $(this.markerTemplate(marker.label));
            markerItem.css('left', percent + '%');
            markerContainer.append(markerItem);
        });

        return this;
    }

    renderObject() {
        this.init();
        this.addVideoElementIntoWrapper();
        this.setTimestamps();
        this.registerPlayPauseEvent();
        this.checkAirPlaySupport();
        this.registerAirPlayTargetPickerClickEvent();
        this.checkPipSupprt();
        this.registerFullScreenClickEvent();
        this.registerSeekEvent();
        this.registerTimeChangeEvent();

        this.OriginalDomObject.replaceWith(this.wrapper);
    }
}

class VideoObjectClasses {
    static getPlayButtonClass() { return 'snazzyvideo-play'; }
    static getPauseButtonClass() { return 'snazzyvideo-pause'; }
    static getVideoPausedClass() { return 'video-is-paused'; }

    static getAirPlayTargetPickerClass() { return 'snazzyvideo-airplay'; }
    static getPipTargetPickerClass() { return 'snazzyvideo-mirror'; }
    static getFullScreenClass() { return 'snazzyvideo-fullscreen'; }

    static getSeekerPositionClass() { return 'snazzyvideo-seeker-position'; }
    static getSeekerTrackClass() { return 'snazzyvideo-seeker-track'; }
    static getSeekerCurrentPositionMaker() { return 'snazzyvideo-seeker-current-position'; }
    static getSeekerPositionLabelClass() { return 'snazzyvideo-seeker-position-label'; }

    static getSeekerPositionHoveredClass() { return 'snazzyvideo-seeker-position-active'; }

    static getRootContainerClass() { return 'snazzyvideo-container'; }
    static getElementWrapperClass() { return 'snazzyvideo-element-wrapper'; }
    static getBaseClass() { return 'snazzyvideo'; }
}
