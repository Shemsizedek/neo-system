<?php
defined('ABSPATH') || exit;
add_action('init', function () {
    register_post_type('neo_form144', array(
        'label' => 'Form 144 Submissions', 'public' => false, 'show_ui' => true,
        'show_in_rest' => false, 'supports' => array('title'),
        'capabilities' => array('edit_posts'=>'manage_options', 'edit_others_posts'=>'manage_options',
            'publish_posts'=>'manage_options', 'read_private_posts'=>'manage_options',
            'delete_posts'=>'manage_options', 'create_posts'=>'do_not_allow'),
        'map_meta_cap' => true
    ));
});
function neo_stewardship_form144_received() {
    if (!is_user_logged_in()) return false;
    return (bool) get_posts(array('post_type'=>'neo_form144', 'post_status'=>'private',
        'author'=>get_current_user_id(), 'numberposts'=>1, 'fields'=>'ids'));
}
add_action('admin_post_neo_form144_upload', function () {
    if (!is_user_logged_in()) wp_die('Sign in required.', '', array('response'=>403));
    check_admin_referer('neo_form144_upload');
    $return = home_url('/holy-stewardship/');
    $fail = function () use ($return) {
        wp_safe_redirect(add_query_arg('form144', 'invalid', $return) . '#neo-form144');
        exit;
    };
    $file = isset($_FILES['form144']) ? $_FILES['form144'] : array();
    if (!isset($_POST['completed144']) || !isset($file['error'], $file['tmp_name'], $file['name'], $file['size']) ||
        $file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']) ||
        $file['size'] < 1 || $file['size'] > 2097152 ||
        strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) !== 'pdf') $fail();
    $bytes = file_get_contents($file['tmp_name']);
    if ($bytes === false || strlen($bytes) > 2097152 || substr($bytes, 0, 5) !== '%PDF-' ||
        strpos(substr($bytes, -2048), '%%EOF') === false) $fail();
    // Private database record, never a public Media Library attachment or uploads URL.
    $id = wp_insert_post(array('post_type'=>'neo_form144', 'post_status'=>'private',
        'post_author'=>get_current_user_id(),
        'post_title'=>'Form 144 — member ' . get_current_user_id() . ' — ' . gmdate('Y-m-d H:i:s')), true);
    if (is_wp_error($id) || !$id) $fail();
    if (!add_post_meta($id, '_neo_pdf', base64_encode($bytes), true)) {
        wp_delete_post($id, true);
        $fail();
    }
    add_post_meta($id, '_neo_review', 'pending_review', true);
    wp_safe_redirect(add_query_arg('form144', 'received', $return) . '#neo-form144');
    exit;
});
add_action('admin_post_neo_form144_download', function () {
    if (!current_user_can('manage_options')) wp_die('Access denied.', '', array('response'=>403));
    $id = isset($_GET['id']) ? absint($_GET['id']) : 0;
    check_admin_referer('neo_form144_download_' . $id);
    if (get_post_type($id) !== 'neo_form144') wp_die('Not found.', '', array('response'=>404));
    $bytes = base64_decode(get_post_meta($id, '_neo_pdf', true), true);
    if ($bytes === false || !$bytes) wp_die('Not found.', '', array('response'=>404));
    nocache_headers();
    header('Content-Type: application/pdf');
    header('X-Content-Type-Options: nosniff');
    header('Content-Disposition: attachment; filename="Form-144-' . $id . '.pdf"');
    echo $bytes;
    exit;
});
add_action('add_meta_boxes_neo_form144', function () {
    add_meta_box('neo_form144_document', 'Private Form 144 document', function ($post) {
        if (!current_user_can('manage_options')) return;
        $url = wp_nonce_url(admin_url('admin-post.php?action=neo_form144_download&id=' . $post->ID),
            'neo_form144_download_' . $post->ID);
        echo '<p>Submission received; completeness and membership eligibility require review.</p><a href="' .
            esc_url($url) . '">Download private PDF</a>';
    }, 'neo_form144');
});
