<?php
/**
 * Plugin Name: HealthCRM Lead Capture
 * Description: Sends submissions from any supported form plugin (Contact Form 7, WPForms, Gravity Forms, Elementor Pro, Fluent Forms, Ninja Forms) to your HealthCRM as new leads.
 * Version: 1.0.0
 * Author: HealthCRM
 * License: GPL-2.0+
 */

if (!defined('ABSPATH')) exit; // No direct access.

define('HEALTHCRM_OPT', 'healthcrm_settings');

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

function healthcrm_defaults() {
    return array('webhook_url' => '', 'secret' => '', 'enabled' => 1, 'last_status' => '');
}

function healthcrm_get($key) {
    $opts = wp_parse_args(get_option(HEALTHCRM_OPT, array()), healthcrm_defaults());
    return isset($opts[$key]) ? $opts[$key] : '';
}

function healthcrm_set($key, $value) {
    $opts = wp_parse_args(get_option(HEALTHCRM_OPT, array()), healthcrm_defaults());
    $opts[$key] = $value;
    update_option(HEALTHCRM_OPT, $opts);
}

add_action('admin_menu', function () {
    add_options_page('HealthCRM Lead Capture', 'HealthCRM', 'manage_options', 'healthcrm', 'healthcrm_settings_page');
});

add_action('admin_init', function () {
    register_setting('healthcrm_group', HEALTHCRM_OPT, function ($input) {
        return array(
            'webhook_url' => esc_url_raw(trim($input['webhook_url'] ?? '')),
            'secret'      => sanitize_text_field(trim($input['secret'] ?? '')),
            'enabled'     => empty($input['enabled']) ? 0 : 1,
            'last_status' => healthcrm_get('last_status'),
        );
    });
});

// "Send test lead" handler.
add_action('admin_post_healthcrm_test', function () {
    if (!current_user_can('manage_options')) wp_die('Not allowed');
    check_admin_referer('healthcrm_test');
    $res = healthcrm_send(array(
        'Name'    => 'Test Lead',
        'Email'   => 'test@example.com',
        'Phone'   => '0000000000',
        'Message' => 'Test submission from the HealthCRM WordPress plugin.',
    ), 'Plugin Test');
    healthcrm_set('last_status', $res);
    wp_safe_redirect(admin_url('options-general.php?page=healthcrm&tested=1'));
    exit;
});

function healthcrm_settings_page() {
    $url    = esc_attr(healthcrm_get('webhook_url'));
    $secret = esc_attr(healthcrm_get('secret'));
    $enabled = healthcrm_get('enabled');
    $last   = healthcrm_get('last_status');
    ?>
    <div class="wrap">
        <h1>HealthCRM Lead Capture</h1>
        <p>Forms on this site will be sent to your HealthCRM as new leads. Paste the webhook URL from your CRM (Settings &rarr; Configuration &rarr; WordPress Forms).</p>
        <form method="post" action="options.php">
            <?php settings_fields('healthcrm_group'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="hc_url">Webhook URL</label></th>
                    <td><input name="<?php echo HEALTHCRM_OPT; ?>[webhook_url]" id="hc_url" type="url" class="regular-text" value="<?php echo $url; ?>" placeholder="https://your-crm.com/api/webhooks/wordpress/xxxx" /></td>
                </tr>
                <tr>
                    <th scope="row"><label for="hc_secret">Shared Secret</label></th>
                    <td>
                        <input name="<?php echo HEALTHCRM_OPT; ?>[secret]" id="hc_secret" type="text" class="regular-text" value="<?php echo $secret; ?>" placeholder="Optional" />
                        <p class="description">Only needed if you set a secret on the integration in HealthCRM.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">Enabled</th>
                    <td><label><input type="checkbox" name="<?php echo HEALTHCRM_OPT; ?>[enabled]" value="1" <?php checked($enabled, 1); ?> /> Capture form submissions</label></td>
                </tr>
            </table>
            <?php submit_button('Save settings'); ?>
        </form>

        <hr />
        <h2>Test connection</h2>
        <p>Sends a sample lead to your CRM so you can confirm it works.</p>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="healthcrm_test" />
            <?php wp_nonce_field('healthcrm_test'); ?>
            <?php submit_button('Send test lead', 'secondary'); ?>
        </form>
        <?php if (!empty($_GET['tested'])) : ?>
            <div class="notice notice-info"><p><strong>Test result:</strong> <?php echo esc_html($last); ?></p></div>
        <?php elseif ($last) : ?>
            <p><em>Last delivery: <?php echo esc_html($last); ?></em></p>
        <?php endif; ?>

        <hr />
        <h2>Supported form plugins</h2>
        <p>Contact Form 7, WPForms, Gravity Forms, Elementor Pro Forms, Fluent Forms, Ninja Forms. Field names like <strong>Name</strong>, <strong>Email</strong>, <strong>Phone</strong> map automatically; anything else is saved on the lead too.</p>
    </div>
    <?php
}

/* -------------------------------------------------------------------------
 * Core: send a normalized field map to the CRM webhook
 * ---------------------------------------------------------------------- */

function healthcrm_send($fields, $form_name = '') {
    if (!healthcrm_get('enabled')) return 'Disabled';
    $url = healthcrm_get('webhook_url');
    if (empty($url)) return 'No webhook URL set';

    // Drop empties, flatten arrays, keep human-readable keys.
    $clean = array();
    foreach ((array) $fields as $k => $v) {
        if ($k === '' || $k === null) continue;
        if (is_array($v)) $v = implode(', ', array_filter(array_map('strval', $v)));
        $v = is_scalar($v) ? trim((string) $v) : '';
        if ($v !== '') $clean[(string) $k] = $v;
    }
    if (empty($clean)) return 'No fields';

    if ($form_name) $clean['Form'] = $form_name;
    $clean['Captured By'] = 'WordPress Plugin';

    $secret = healthcrm_get('secret');
    if ($secret) $url = add_query_arg('secret', rawurlencode($secret), $url);

    $resp = wp_remote_post($url, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body'    => wp_json_encode(array('fields' => $clean)),
        'timeout' => 15,
    ));

    if (is_wp_error($resp)) {
        $msg = 'Error: ' . $resp->get_error_message();
    } else {
        $code = wp_remote_retrieve_response_code($resp);
        $msg = ($code >= 200 && $code < 300) ? ('OK (' . $code . ') at ' . current_time('mysql')) : ('Failed: HTTP ' . $code);
    }
    healthcrm_set('last_status', $msg);
    return $msg;
}

/* -------------------------------------------------------------------------
 * Hooks for each supported form plugin
 * ---------------------------------------------------------------------- */

// Contact Form 7
add_action('wpcf7_mail_sent', function ($cf7) {
    if (!class_exists('WPCF7_Submission')) return;
    $submission = WPCF7_Submission::get_instance();
    if (!$submission) return;
    $data = $submission->get_posted_data();
    $fields = array();
    foreach ((array) $data as $key => $value) {
        if (substr($key, 0, 1) === '_') continue; // CF7 internals
        $fields[$key] = $value;
    }
    healthcrm_send($fields, method_exists($cf7, 'title') ? $cf7->title() : 'Contact Form 7');
});

// WPForms
add_action('wpforms_process_complete', function ($fields, $entry, $form_data, $entry_id) {
    $map = array();
    foreach ((array) $fields as $f) {
        $name = !empty($f['name']) ? $f['name'] : ('Field ' . ($f['id'] ?? ''));
        $map[$name] = $f['value'] ?? '';
    }
    healthcrm_send($map, $form_data['settings']['form_title'] ?? 'WPForms');
}, 10, 4);

// Gravity Forms
add_action('gform_after_submission', function ($entry, $form) {
    $map = array();
    foreach ((array) $form['fields'] as $field) {
        $label = !empty($field->label) ? $field->label : ('Field ' . $field->id);
        $val = function_exists('rgar') ? rgar($entry, (string) $field->id) : ($entry[(string) $field->id] ?? '');
        $map[$label] = $val;
    }
    healthcrm_send($map, $form['title'] ?? 'Gravity Forms');
}, 10, 2);

// Elementor Pro Forms
add_action('elementor_pro/forms/new_record', function ($record, $handler) {
    $raw = $record->get('fields');
    $map = array();
    foreach ((array) $raw as $id => $field) {
        $label = !empty($field['title']) ? $field['title'] : $id;
        $map[$label] = $field['value'] ?? '';
    }
    $form_name = method_exists($record, 'get_form_settings') ? $record->get_form_settings('form_name') : 'Elementor';
    healthcrm_send($map, $form_name ?: 'Elementor');
}, 10, 2);

// Fluent Forms
add_action('fluentform/submission_inserted', function ($entryId, $formData, $form) {
    $map = array();
    foreach ((array) $formData as $key => $value) {
        $map[$key] = $value;
    }
    $title = is_object($form) && isset($form->title) ? $form->title : 'Fluent Forms';
    healthcrm_send($map, $title);
}, 10, 3);

// Ninja Forms
add_action('ninja_forms_after_submission', function ($form_data) {
    $map = array();
    foreach ((array) ($form_data['fields'] ?? array()) as $field) {
        $label = !empty($field['label']) ? $field['label'] : ($field['key'] ?? 'Field');
        $map[$label] = $field['value'] ?? '';
    }
    $title = $form_data['settings']['title'] ?? 'Ninja Forms';
    healthcrm_send($map, $title);
});
