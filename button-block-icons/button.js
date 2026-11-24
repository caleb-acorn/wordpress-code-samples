// =============================================================
//  core/button — Block Editor Extensions
// =============================================================
//  Adds Size and Icon controls to the Styles tab inspector.
//
//  Size:  adds/removes `is-style-small` class.
//  Icon:  reads SVGs from window.acornButtonIcons (populated by
//         PHP if the child theme has icons in acorn-stash/icons/core/button/).
//         Stores selection as `has-icon-{slug}` + `icon-position-{before|after}`,
//         plus optional `icon-flipped` (horizontal mirror; not gated on position).
//         Editor preview uses CSS mask-image injected into the canvas document.
//         Frontend HTML injection is handled via the render_block PHP filter.
// =============================================================

(function () {
    const { addFilter } = wp.hooks;
    const { InspectorControls } = wp.blockEditor;
    const {
        __experimentalToolsPanel: ToolsPanel,
        __experimentalToolsPanelItem: ToolsPanelItem,
        __experimentalToggleGroupControl: ToggleGroupControl,
        __experimentalToggleGroupControlOption: ToggleGroupControlOption,
        // Falls back to ToggleGroupControlOption if the icon variant isn't available
        __experimentalToggleGroupControlOptionIcon: ToggleGroupControlOptionIcon,
        ToggleControl,
    } = wp.components;
    const { SVG, Path } = wp.primitives;
    const { createHigherOrderComponent } = wp.compose;
    const { createElement: el, Fragment, useEffect } = wp.element;

    // Icons representing icon-before-text and icon-after-text positions
    const iconBefore = el(SVG, { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24' },
        el(Path, { d: 'M9 7h2v10H9V7zm-4 4h3v2H5v-2zm7 0h7v2h-7v-2z' })
    );
    const iconAfter = el(SVG, { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24' },
        el(Path, { d: 'M13 7h2v10h-2V7zm3 4h3v2h-3v-2zm-11 0h7v2H5v-2z' })
    );

    // Use the icon variant if available, otherwise fall back to the text variant
    const PositionOption = ToggleGroupControlOptionIcon || ToggleGroupControlOption;

    const withButtonControls = createHigherOrderComponent((BlockEdit) => {
        return (props) => {
            // Only extend the button block, pass everything else through unchanged
            if (props.name !== 'core/button') {
                return el(BlockEdit, props);
            }

            const { attributes: { className = '' }, setAttributes } = props;
            // Filter out empty strings so class operations stay clean
            const classes = className.split(' ').filter(Boolean);

            // =========================================================
            // Size
            // =========================================================

            const isSmall = classes.includes('is-style-small');

            // Toggle is-style-small; clear it first to avoid duplicates
            const setSize = (size) => {
                const next = classes.filter(c => c !== 'is-style-small');
                if (size === 'small') next.push('is-style-small');
                setAttributes({ className: next.join(' ') || undefined });
            };

            // =========================================================
            // Icon
            // =========================================================

            // window.acornButtonIcons is set by PHP only when the child theme has icons
            const icons = window.acornButtonIcons || [];
            // Find the active icon class, e.g. "has-icon-arrow-right"
            const iconClass = classes.find(c => c.startsWith('has-icon-'));
            // Strip the "has-icon-" prefix to get just the slug
            const iconSlug = iconClass ? iconClass.slice(9) : '';
            const isAfter = classes.includes('icon-position-after');
            const isFlipped = classes.includes('icon-flipped');

            // Strips every icon class before setting new ones, so they cannot
            // stack. Position and flip survive an icon switch; clearing the icon
            // drops both, being meaningless without one.
            const setIcon = (slug) => {
                const next = classes.filter(c =>
                    !c.startsWith('has-icon-') &&
                    c !== 'icon-position-before' &&
                    c !== 'icon-position-after' &&
                    c !== 'icon-flipped'
                );
                if (slug) {
                    next.push('has-icon-' + slug);
                    const existingPos = classes.includes('icon-position-before')
                        ? 'icon-position-before'
                        : 'icon-position-after';
                    next.push(existingPos);
                    if (classes.includes('icon-flipped')) next.push('icon-flipped');
                }
                setAttributes({ className: next.join(' ') || undefined });
            };

            // Toggle the horizontal-mirror class without touching icon or position
            const setIconFlip = (on) => {
                const next = classes.filter(c => c !== 'icon-flipped');
                if (on) next.push('icon-flipped');
                setAttributes({ className: next.join(' ') || undefined });
            };

            // Swap position class without touching the icon selection
            const setIconPosition = (pos) => {
                const next = classes.filter(c =>
                    c !== 'icon-position-before' &&
                    c !== 'icon-position-after'
                );
                next.push('icon-position-' + pos);
                setAttributes({ className: next.join(' ') || undefined });
            };

            // Injects mask-image rules into the editor canvas, which may be in an
            // iframe — so every accessible document is searched, and the ID check
            // keeps it idempotent across blocks.
            useEffect(() => {
                // Editor canvas: inject mask-image rules so icons render via ::before/::after.
                if (!icons.length) return;

                const injectIconCSS = (doc) => {
                    if (!doc || doc.getElementById('acorn-button-icons-css')) return;
                    const rules = icons.map(({ slug, url }) =>
                        `.wp-block-button.has-icon-${slug}{--button-icon-url:url('${url}');--button-icon-display:inline-block;}`
                    ).join('');
                    const style = doc.createElement('style');
                    style.id = 'acorn-button-icons-css';
                    style.textContent = rules;
                    doc.head.appendChild(style);
                };

                injectIconCSS(document);
                try {
                    window.parent?.document?.querySelectorAll('iframe')
                        .forEach(f => f.contentDocument && injectIconCSS(f.contentDocument));
                } catch (e) {}
            }, []); // eslint-disable-line react-hooks/exhaustive-deps

            // =========================================================
            // Inspector panels
            // =========================================================

            // Each panel uses its own InspectorControls fill — the same pattern WP core
            // uses for Color, Typography, etc. — to avoid slot/fill conflicts.
            // Only rendered when the child theme has supplied at least one icon.
            const iconPanel = icons.length > 0 && el(InspectorControls, { group: 'styles' },
                el(ToolsPanel, {
                    label: 'Icon',
                    resetAll: () => setIcon(''),
                    className: 'acorn-icon-panel',
                },
                    // ToolsPanelItem is required for ToolsPanel to render its children
                    el(ToolsPanelItem, {
                        label: 'Icon',
                        hasValue: () => !!iconSlug,
                        onDeselect: () => setIcon(''),
                        isShownByDefault: true,
                    },
                        // Icon picker — options are built from window.acornButtonIcons at runtime
                        el(ToggleGroupControl, {
                            label: 'Icon',
                            value: iconSlug || 'none',
                            onChange: (val) => setIcon(val === 'none' ? '' : val),
                            isBlock: true,
                            __next40pxDefaultSize: true,
                            __nextHasNoMarginBottom: true,
                        },
                            el(PositionOption, {
                                value: 'none',
                                label: 'None',
                                ...(ToggleGroupControlOptionIcon ? {
                                    icon: el(SVG, { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24' },
                                        el(Path, { d: 'M13.4 12l4.3-4.3-1.4-1.4-4.3 4.3-4.3-4.3-1.4 1.4 4.3 4.3-4.3 4.3 1.4 1.4 4.3-4.3 4.3 4.3 1.4-1.4z' })
                                    )
                                } : {}),
                            }),
                            ...icons.map(icon =>
                                el(PositionOption, {
                                    value: icon.slug,
                                    label: icon.slug,
                                    ...(ToggleGroupControlOptionIcon ? {
                                        // Render the SVG as a currentColor-tinted mask,
                                        // matching the canvas preview in _button-editor.scss.
                                        icon: el('span', {
                                            'aria-hidden': true,
                                            style: {
                                                display: 'inline-block',
                                                width: '24px',
                                                height: '24px',
                                                backgroundColor: 'currentColor',
                                                WebkitMask: `url('${icon.url}') center / contain no-repeat`,
                                                mask: `url('${icon.url}') center / contain no-repeat`,
                                                // Reflect the Flip toggle so the picker matches the rendered icon
                                                transform: isFlipped ? 'scaleX(-1)' : undefined,
                                            },
                                        })
                                    } : {})
                                })
                            )
                        )
                    ),
                    // Position control — only visible when an icon is selected
                    iconSlug ? el(ToolsPanelItem, {
                        label: 'Position',
                        hasValue: () => true,
                        onDeselect: () => setIconPosition('after'),
                        isShownByDefault: true,
                    },
                        el(ToggleGroupControl, {
                            label: 'Position',
                            value: isAfter ? 'after' : 'before',
                            onChange: setIconPosition,
                            isBlock: true,
                            __next40pxDefaultSize: true,
                            __nextHasNoMarginBottom: true,
                        },
                            el(PositionOption, {
                                value: 'before',
                                label: 'Before',
                                ...(ToggleGroupControlOptionIcon ? { icon: iconBefore } : {}),
                            }),
                            el(PositionOption, {
                                value: 'after',
                                label: 'After',
                                ...(ToggleGroupControlOptionIcon ? { icon: iconAfter } : {}),
                            })
                        )
                    ) : null,
                    // Flip control — mirror the icon horizontally; only visible when an icon is selected
                    iconSlug ? el(ToolsPanelItem, {
                        label: 'Flip icon',
                        hasValue: () => isFlipped,
                        onDeselect: () => setIconFlip(false),
                        isShownByDefault: true,
                    },
                        el(ToggleControl, {
                            label: 'Flip icon',
                            help: 'Mirror the icon horizontally (e.g. a back-pointing arrow).',
                            checked: isFlipped,
                            onChange: setIconFlip,
                            __nextHasNoMarginBottom: true,
                        })
                    ) : null
                )
            );

            return el(Fragment, null,
                el(BlockEdit, props),
                // Size panel
                el(InspectorControls, { group: 'styles' },
                    el(ToolsPanel, {
                        label: 'Size',
                        resetAll: () => setSize('default'),
                        className: 'acorn-size-panel',
                    },
                        el(ToggleGroupControl, {
                            value: isSmall ? 'small' : 'default',
                            onChange: setSize,
                            isBlock: true,
                            __next40pxDefaultSize: true,
                            __nextHasNoMarginBottom: true,
                        },
                            el(ToggleGroupControlOption, { value: 'default', label: 'Default' }),
                            el(ToggleGroupControlOption, { value: 'small', label: 'Small' })
                        )
                    )
                ),
                // Icon panel (null when no icons are available in the child theme)
                iconPanel
            );
        };
    }, 'withButtonControls');

    addFilter('editor.BlockEdit', 'acorn/button-controls', withButtonControls, 200);
})();
