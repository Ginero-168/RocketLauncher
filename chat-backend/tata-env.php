<?php
/**
 * TATA Chat - Environment config
 *
 * This file is overwritten by the GitHub Actions deploy workflow.
 * It contains the database credentials as a base64-encoded JSON blob
 * so the values are not plain text in the repository or on disk.
 *
 * Do NOT commit a real tata-env.php. The workflow regenerates it per deploy.
 */
$tataEnv = [];
