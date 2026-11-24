<?php
// =============================================================
//  Scroll-Reveal Animations
// =============================================================
//  The only PHP in the feature: prints the inline <head> js-anim snippet,
//  enqueues the frontend CSS+JS and the editor control, and injects
//  window.acornAnimAssets for the editor.
//
//  Elements are hidden ONLY under html.js-anim, which this file adds before
//  first paint — so no JS, reduced motion, or print = fully visible.
//
//  How the pieces fit together: see the README.
//
//  @package Acorn Creative
//  @since 1.0.0
// =============================================================


// ============================================
// HEAD SNIPPET: add js-anim before first paint
// ============================================
// Runs at wp_head priority 0, so the class exists before any content renders
// and there is no FOUC window. Bails under prefers-reduced-motion; the
// removeEventListener/timeout tail is the failsafe.
add_action( 'wp_head', function() {
    wp_print_inline_script_tag(
        '(function(){try{if(window.matchMedia("(prefers-reduced-motion:reduce)").matches)return}catch(e){}var d=document.documentElement;d.classList.add("js-anim");function c(){if(!window.acornAnimOK)d.classList.remove("js-anim")}window.addEventListener("load",c);setTimeout(c,4000)})();',
        array( 'id' => 'acorn-anim-boot' )
    );
}, 0 );


// ============================================
// FRONTEND: base CSS + IntersectionObserver JS
// ============================================
add_action( 'wp_enqueue_scripts', function() {
    $css_path = get_template_directory() . '/acorn-stash/css/animations.css';
    wp_enqueue_style(
        'acorn-animations',
        get_template_directory_uri() . '/acorn-stash/css/animations.css',
        array(),
        filemtime( $css_path )
    );

    $js_path = get_template_directory() . '/acorn-stash/js/animations.js';
    wp_enqueue_script(
        'acorn-animations',
        get_template_directory_uri() . '/acorn-stash/js/animations.js',
        array(),
        filemtime( $js_path ),
        true
    );
} );


// ============================================
// EDITOR: toolbar control (cross-block)
// ============================================
// Enqueued directly, NOT via the js/blocks/{ns}/{name}.js glob — that is one
// handle per block, and this script filters every block on its allowlist.
add_action( 'enqueue_block_editor_assets', function() {
    $js_path = get_template_directory() . '/acorn-stash/js/animations-editor.js';
    wp_enqueue_script(
        'acorn-animations-editor',
        get_template_directory_uri() . '/acorn-stash/js/animations-editor.js',
        array( 'wp-hooks', 'wp-block-editor', 'wp-components', 'wp-compose', 'wp-element', 'wp-data' ),
        filemtime( $js_path )
    );

    $editor_css = get_template_directory() . '/acorn-stash/css/animations-editor.css';
    wp_enqueue_style(
        'acorn-animations-editor',
        get_template_directory_uri() . '/acorn-stash/css/animations-editor.css',
        array(),
        filemtime( $editor_css )
    );

    // Assets for the popover header (logo).
    wp_add_inline_script(
        'acorn-animations-editor',
        'window.acornAnimAssets = ' . wp_json_encode( array(
            'logo' => get_template_directory_uri() . '/acorn-logo.svg',
        ) ) . ';',
        'before'
    );
} );
