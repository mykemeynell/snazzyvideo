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

        this.wrapper = $(this.wrapperContainer());

        this.currentTime = this.DomObject[0].currentTime;
        this.duration = this.OriginalDomObject[0].duration;
    }

    debug() {
        return this.config.debug;
    }

    init() {
        this.DomObject.removeAttr('controls');
        this.DomObject.removeAttr('autoplay');
        this.DomObject.removeAttr('loop');
    }

    markerTemplate(label) {
        let template = `<div class="snazzyvideo-seeker-marker snazzyvideo-seeker-marker-hovered">
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
                        <div class="snazzyvideo-seeker-position"></div>
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
        this.wrapper.find('.snazzyvideo-element-wrapper').prepend(this.DomObject);
        let wrapper = '.' + VideoObjectClasses.getRootContainerClass();
        this.wrapper.addClass(VideoObjectClasses.getVideoPausedClass());
    }

    setTimestamps() {
        if(this.config.debug) {
            console.debug("Duration container", this.wrapper.find('.snazzyvideo-total-time > span'));
            console.debug("Video duration", this.duration);
            console.debug("Current time container", this.wrapper.find('.snazzyvideo-total-time > span'));
            console.debug("Video current time", this.currentTime);
        }

        // Update the length of the video in the wrapper
        this.wrapper.find('.snazzyvideo-total-time > span').text(this.formatTime(this.duration));
        // Update the length of the video in the wrapper
        this.wrapper.find('.snazzyvideo-current-time > span').text(this.formatTime(this.currentTime));
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
    }

    registerTimeChangeEvent() {
        let updateCurrentTimeStamp = () => {
            let currentTime = this.currentTime = this.DomObject[0].currentTime;
            this.wrapper.find('.snazzyvideo-current-time > span').text(this.formatTime(currentTime));
        };

        let updateSeekerPosition = () => {
            let currentTime = this.currentTime = this.DomObject[0].currentTime;
            let duration = this.DomObject[0].duration;
            let percentPlayed = ((currentTime / duration) * 100) + '%';

            this.wrapper.find('.snazzyvideo-seeker-current-position').css('left', percentPlayed);
        };

        this.DomObject.on('timeupdate', updateCurrentTimeStamp);
        this.DomObject.on('timeupdate', updateSeekerPosition);
    }

    checkAirPlaySupport() {
        // TODO: Fix AirPlay support feature in browser. Doesn't appear to be working.

        let WebKitPlaybackTargetAvailabilityEvent = window.WebKitPlaybackTargetAvailabilityEvent;

        if(this.debug()) { console.info("Airplay support", WebKitPlaybackTargetAvailabilityEvent); }
        if (WebKitPlaybackTargetAvailabilityEvent) {
            this.DomObject.on('webkitplaybacktargetavailabilitychanged', (event) => {
                switch (event.availability) {
                    case "available":
                        this.wrapper.find('.snazzyvideo-airplay').css('display', 'flex');
                        break;

                    default:
                        this.wrapper.find('.snazzyvideo-airplay').css('display', 'none');
                }
            });
        } else { this.wrapper.find('.snazzyvideo-airplay').css('display', 'none'); }
    }

    renderObject() {
        this.init();

        this.addVideoElementIntoWrapper();
        this.setTimestamps();
        this.registerPlayPauseEvent();
        this.registerTimeChangeEvent();
        this.checkAirPlaySupport();


        this.OriginalDomObject.replaceWith(this.wrapper);
    }
}

class VideoObjectClasses {
    static getPlayButtonClass() { return 'snazzyvideo-play'; }
    static getPauseButtonClass() { return 'snazzyvideo-pause'; }
    static getVideoPausedClass() { return 'video-is-paused'; }
    static getRootContainerClass() { return 'snazzyvideo-container'; }
}
