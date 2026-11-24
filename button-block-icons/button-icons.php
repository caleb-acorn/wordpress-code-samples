<?php
// ============================================
/// BUTTON BLOCK — ICON SUPPORT
// ============================================
// Scans the child theme's acorn-stash/icons/core/button/ directory.
// If no SVGs are found, nothing is registered and the editor control never appears.

function acorn_maybe_enqueue_button_icons() {
    $icons_dir = get_stylesheet_directory() . '/acorn-stash/icons/core/button/';
    if ( ! is_dir( $icons_dir ) ) return;

    $files = glob( $icons_dir . '*.svg' );
    if ( empty( $files ) ) return;

    $icons = [];
    foreach ( $files as $file ) {
        $slug    = basename( $file, '.svg' );
        $url     = get_stylesheet_directory_uri() . '/acorn-stash/icons/core/button/' . $slug . '.svg';
        $icons[] = [ 'slug' => $slug, 'url' => $url ];
    }

    wp_add_inline_script(
        'acorn-theme-block-core-button-editor',
        'window.acornButtonIcons = ' . wp_json_encode( $icons ) . ';',
        'before'
    );
}
add_action( 'enqueue_block_editor_assets', 'acorn_maybe_enqueue_button_icons', 20 );


function acorn_render_button_icon( $block_content, $block ) {
    if ( ( $block['blockName'] ?? '' ) !== 'core/button' ) return $block_content;

    $classes    = explode( ' ', $block['attrs']['className'] ?? '' );
    $icon_class = current( array_filter( $classes, fn( $c ) => str_starts_with( $c, 'has-icon-' ) ) );
    if ( ! $icon_class ) return $block_content;

    $slug     = substr( $icon_class, 9 );
    $svg_path = get_stylesheet_directory() . '/acorn-stash/icons/core/button/' . $slug . '.svg';
    if ( ! file_exists( $svg_path ) ) return $block_content;

    $svg      = acorn_add_icon_class( acorn_clean_svg( file_get_contents( $svg_path ) ), $slug );
    $is_after = in_array( 'icon-position-after', $classes );

    if ( $is_after ) {
        $block_content = preg_replace_callback(
            '/(<\/a>)/i',
            fn( $m ) => $svg . $m[1],
            $block_content,
            1
        );
    } else {
        $block_content = preg_replace_callback(
            '/(<a\b[^>]*>)/i',
            fn( $m ) => $m[1] . $svg,
            $block_content,
            1
        );
    }

    return $block_content;
}
add_filter( 'render_block', 'acorn_render_button_icon', 10, 2 );


function acorn_clean_svg( $svg ) {
    $svg = preg_replace( '/<\?xml[^>]*\?>\s*/i', '', $svg );
    $svg = preg_replace( '/<!DOCTYPE[^>]*>\s*/i', '', $svg );
    return trim( $svg );
}

// Adds icon-{slug} class to the <svg> element for CSS targeting
function acorn_add_icon_class( $svg, $slug ) {
    return preg_replace_callback(
        '/<svg\b([^>]*)>/i',
        function ( $m ) use ( $slug ) {
            $attrs = $m[1];
            $class = 'icon-' . $slug;
            if ( preg_match( '/class=["\']([^"\']*)["\']/', $attrs, $cm ) ) {
                $attrs = str_replace( $cm[0], 'class="' . trim( $cm[1] . ' ' . $class ) . '"', $attrs );
            } else {
                $attrs .= ' class="' . $class . '"';
            }
            return '<svg' . $attrs . '>';
        },
        $svg,
        1
    );
}


// ============================================
// SHARED: ROLE RESOLUTION
// ============================================
// Features ask for a role BY NAME, never by index — the filename is the role.
// The one-file fallback keeps the "drop in any .svg" flow working; past that, a
// missing role returns null.
function acorn_icon_by_role( array $icons, string $role, bool $solo_fallback = true ): ?array {
    foreach ( $icons as $icon ) {
        if ( $icon['slug'] === $role ) return $icon;
    }
    // Strict for multi-role features: a nav dir holding only submenu.svg must
    // NOT hand that chevron back for the 'open' role.
    return ( $solo_fallback && 1 === count( $icons ) ) ? $icons[0] : null;
}

// Builds the role-keyed payload handed to the editor JS. Every icon feature uses
// this same shape for window.acorn{Name}Icons — { role: {slug,url,dataUrl} } — so
// features differ only in key count, never in structure.
function acorn_icon_js_map( array $icons, array $roles ): array {
    $map = [];
    // A feature asking for more than one role gets strict matching — otherwise
    // a dir with a single SVG would answer to every role at once.
    $solo = 1 === count( $roles );
    foreach ( $roles as $role ) {
        $icon = acorn_icon_by_role( $icons, $role, $solo );
        if ( ! $icon ) continue;
        $map[ $role ] = [
            'slug'    => $icon['slug'],
            'url'     => $icon['url'],
            'dataUrl' => $icon['dataUrl'],
        ];
    }
    return $map;
}
