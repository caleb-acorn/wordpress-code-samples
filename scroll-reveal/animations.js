// =============================================================
//  Scroll-Reveal Animations — Frontend Runtime
// =============================================================
//  Reveals elements carrying the anim-* classes by adding .is-revealed once.
//  The states and keyframes live in animations.css, gated on html.js-anim.
//
//  Anything already in the viewport at init reveals immediately, so a hero
//  never sits invisible; everything below the fold reveals on scroll and is
//  then unobserved. Bails when js-anim is absent — the hidden state never
//  applied, so there is nothing to reveal.
//
//  The progressive-enhancement contract, the failsafe and the stagger rules:
// =============================================================

( function () {
    // Signals a healthy load to the head-snippet failsafe in animations.php.
    // MUST be the first statement, and before any early return — a script that
    // ran at all counts as OK.
    window.acornAnimOK = true;

    var root = document.documentElement;
    if ( ! root.classList.contains( 'js-anim' ) ) return;

    // Includes .anim-stagger: revealing the parent (adding is-revealed to
    // it) is all the runtime does — the child sequencing is pure CSS
    // (animations.css). The children carry no class of their own.
    var matched = document.querySelectorAll(
        '.anim-fade, .anim-fade-up, .anim-fade-down, .anim-fade-left, .anim-fade-right, .anim-stagger'
    );

    var CHILD_ANIM_CLASSES = [
        'anim-fade', 'anim-fade-up', 'anim-fade-down', 'anim-fade-left', 'anim-fade-right'
    ];

    function hasOwnAnim( node ) {
        for ( var i = 0; i < CHILD_ANIM_CLASSES.length; i++ ) {
            if ( node.classList.contains( CHILD_ANIM_CLASSES[ i ] ) ) return true;
        }
        return false;
    }

    // Child guard: a DIRECT child of a stagger parent with its OWN anim-* class
    // is not observed here — reveal() handles it in lockstep instead, so two
    // observers cannot race.
    var els = [];
    Array.prototype.forEach.call( matched, function ( el ) {
        var parent = el.parentElement;
        if ( parent
            && parent.classList.contains( 'anim-stagger' )
            && ! el.classList.contains( 'anim-stagger' ) ) {
            return;
        }
        els.push( el );
    } );
    if ( ! els.length ) return;

    function reveal( el ) {
        el.classList.add( 'is-revealed' );

        // Releases the hidden state of a guarded direct child, without which the
        // parent's keyframe animates it 0→0 and strands it invisible. Direct
        // children only, and no :scope.
        if ( el.classList.contains( 'anim-stagger' ) ) {
            var kids = el.children;
            for ( var i = 0; i < kids.length; i++ ) {
                if ( hasOwnAnim( kids[ i ] ) ) kids[ i ].classList.add( 'is-revealed' );
            }
        }
    }

    // No IntersectionObserver (ancient browser): never leave content
    // hidden — reveal everything up front.
    if ( ! ( 'IntersectionObserver' in window ) ) {
        Array.prototype.forEach.call( els, reveal );
        return;
    }

    // Shrinks the observed area up from the viewport bottom, so an element
    // scrolls ~15% into view before it reveals. Needs the failsafe below.
    var observer = new IntersectionObserver( function ( entries ) {
        entries.forEach( function ( entry ) {
            if ( ! entry.isIntersecting ) return;
            reveal( entry.target );
            observer.unobserve( entry.target );
        } );
    }, { rootMargin: '0px 0px -15% 0px' } );

    var viewportHeight = window.innerHeight || root.clientHeight;

    Array.prototype.forEach.call( els, function ( el ) {
        var rect = el.getBoundingClientRect();
        // Already in the initial viewport → play on load (LCP-safe:
        // the element never waits invisible for a scroll event).
        if ( rect.top < viewportHeight && rect.bottom > 0 ) {
            reveal( el );
        } else {
            observer.observe( el );
        }
    } );

    // Dead-zone failsafe for the margin above: at max scroll an element parked
    // in the bottom band never crosses the trigger line. scrollHeight is read
    // lazily, since it grows as images load.
    function onScroll() {
        if ( window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 ) {
            observer.disconnect();
            Array.prototype.forEach.call( els, reveal ); // reveal() is idempotent
            window.removeEventListener( 'scroll', onScroll );
        }
    }
    window.addEventListener( 'scroll', onScroll, { passive: true } );
} )();
