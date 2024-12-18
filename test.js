import {randomInt} from 'node:crypto';
import process from 'node:process';
import os from 'node:os';
import tty from 'node:tty';
import test from 'ava';

const currentNodeVersion = process.versions.node;

const importFresh = async moduleName => import(`${moduleName}?${randomInt(100_000_000)}`);

const importMain = async () => {
	const {default: main} = await importFresh('./index.js');
	return main;
};

test.beforeEach(() => {
	Object.defineProperty(process, 'platform', {
		value: 'linux',
	});

	Object.defineProperty(process.versions, 'node', {
		value: currentNodeVersion,
	});

	process.stdout.isTTY = true;
	process.argv = [];
	process.env = {};
	tty.isatty = () => true;
});

test('return true if `FORCE_COLOR` is in env', async t => {
	process.stdout.isTTY = false;
	process.env.FORCE_COLOR = 'true';
	const result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 1);
});

test('return true if `FORCE_COLOR` is in env, but honor 256', async t => {
	process.argv = ['--color=256'];
	process.env.FORCE_COLOR = 'true';
	const result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 2);
});

test('return true if `FORCE_COLOR` is in env, but honor 256 #2', async t => {
	process.argv = ['--color=256'];
	process.env.FORCE_COLOR = '1';
	const result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 2);
});

test('return false if `FORCE_COLOR` is in env and is 0', async t => {
	process.env.FORCE_COLOR = '0';
	const result = await importMain();
	t.false(result.stdout);
});

test('do not cache `FORCE_COLOR`', async t => {
	process.env.FORCE_COLOR = '0';
	const {default: result, createSupportsColor} = await importFresh('./index.js');
	t.false(result.stdout);
	process.env.FORCE_COLOR = '1';
	const updatedStdOut = createSupportsColor({isTTY: tty.isatty(1)});
	t.truthy(updatedStdOut);
});

test('return false if not TTY', async t => {
	process.stdout.isTTY = false;
	const result = await importMain();
	t.false(result.stdout);
});

test('return false if --no-color flag is used', async t => {
	process.env = {TERM: 'xterm-256color'};
	process.argv = ['--no-color'];
	const result = await importMain();
	t.false(result.stdout);
});

test('return false if --no-colors flag is used', async t => {
	process.env = {TERM: 'xterm-256color'};
	process.argv = ['--no-colors'];
	const result = await importMain();
	t.false(result.stdout);
});

test('return true if --color flag is used', async t => {
	process.argv = ['--color'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return true if --colors flag is used', async t => {
	process.argv = ['--colors'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return true if `COLORTERM` is in env', async t => {
	process.env.COLORTERM = true;
	const result = await importMain();
	t.truthy(result.stdout);
});

test('support `--color=true` flag', async t => {
	process.argv = ['--color=true'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('support `--color=always` flag', async t => {
	process.argv = ['--color=always'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('support `--color=false` flag', async t => {
	process.env = {TERM: 'xterm-256color'};
	process.argv = ['--color=false'];
	const result = await importMain();
	t.false(result.stdout);
});

test('support `--color=256` flag', async t => {
	process.argv = ['--color=256'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('level should be 2 if `--color=256` flag is used', async t => {
	process.argv = ['--color=256'];
	const result = await importMain();
	t.is(result.stdout.level, 2);
	t.true(result.stdout.has256);
});

test('support `--color=16m` flag', async t => {
	process.argv = ['--color=16m'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('support `--color=full` flag', async t => {
	process.argv = ['--color=full'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('support `--color=truecolor` flag', async t => {
	process.argv = ['--color=truecolor'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('level should be 3 if `--color=16m` flag is used', async t => {
	process.argv = ['--color=16m'];
	const result = await importMain();
	t.is(result.stdout.level, 3);
	t.true(result.stdout.has256);
	t.true(result.stdout.has16m);
});

test('ignore post-terminator flags', async t => {
	process.argv = ['--color', '--', '--no-color'];
	const result = await importMain();
	t.truthy(result.stdout);
});

test('allow tests of the properties on false', async t => {
	process.env = {TERM: 'xterm-256color'};
	process.argv = ['--no-color'];
	const result = await importMain();
	t.is(result.stdout.hasBasic, undefined);
	t.is(result.stdout.has256, undefined);
	t.is(result.stdout.has16m, undefined);
	t.false(result.stdout.level > 0);
});

test('return false if `CI` is in env', async t => {
	process.env.CI = 'AppVeyor';
	const result = await importMain();
	t.false(result.stdout);
});

test('return true if `TRAVIS` is in env', async t => {
	process.env = {CI: 'Travis', TRAVIS: '1'};
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return level 3 if `CIRCLECI` is in env', async t => {
	process.env = {CI: true, CIRCLECI: true};
	const result = await importMain();
	t.is(result.stdout.level, 3);
});

test('return true if `APPVEYOR` is in env', async t => {
	process.env = {CI: true, APPVEYOR: true};
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return true if `GITLAB_CI` is in env', async t => {
	process.env = {CI: true, GITLAB_CI: true};
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return true if `BUILDKITE` is in env', async t => {
	process.env = {CI: true, BUILDKITE: true};
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return true if `DRONE` is in env', async t => {
	process.env = {CI: true, DRONE: true};
	const result = await importMain();
	t.truthy(result.stdout);
});

test('return level 3 if `GITEA_ACTIONS` is in env', async t => {
	process.env = {CI: true, GITEA_ACTIONS: true};
	const result = await importMain();
	t.is(result.stdout.level, 3);
});

test('return true if Codeship is in env', async t => {
	process.env = {CI: true, CI_NAME: 'codeship'};
	const result = await importMain();
	t.truthy(result);
});

test('return false if `TEAMCITY_VERSION` is in env and is < 9.1', async t => {
	process.env.TEAMCITY_VERSION = '9.0.5 (build 32523)';
	const result = await importMain();
	t.false(result.stdout);
});

test('return level 1 if `TEAMCITY_VERSION` is in env and is >= 9.1', async t => {
	process.env.TEAMCITY_VERSION = '9.1.0 (build 32523)';
	const result = await importMain();
	t.is(result.stdout.level, 1);
});

test('support rxvt', async t => {
	process.env = {TERM: 'rxvt'};
	const result = await importMain();
	t.is(result.stdout.level, 1);
});

test('prefer level 2/xterm over COLORTERM', async t => {
	process.env = {COLORTERM: '1', TERM: 'xterm-256color'};
	const result = await importMain();
	t.is(result.stdout.level, 2);
});

test('support screen-256color', async t => {
	process.env = {TERM: 'screen-256color'};
	const result = await importMain();
	t.is(result.stdout.level, 2);
});

test('support putty-256color', async t => {
	process.env = {TERM: 'putty-256color'};
	const result = await importMain();
	t.is(result.stdout.level, 2);
});

test('level should be 3 when using iTerm 3.0', async t => {
	Object.defineProperty(process, 'platform', {
		value: 'darwin',
	});
	process.env = {
		TERM_PROGRAM: 'iTerm.app',
		TERM_PROGRAM_VERSION: '3.0.10',
	};
	const result = await importMain();
	t.is(result.stdout.level, 3);
});

test('level should be 2 when using iTerm 2.9', async t => {
	Object.defineProperty(process, 'platform', {
		value: 'darwin',
	});
	process.env = {
		TERM_PROGRAM: 'iTerm.app',
		TERM_PROGRAM_VERSION: '2.9.3',
	};
	const result = await importMain();
	t.is(result.stdout.level, 2);
});

test('return level 1 if on Windows earlier than 10 build 10586', async t => {
	Object.defineProperty(process, 'platform', {
		value: 'win32',
	});
	Object.defineProperty(process.versions, 'node', {
		value: '8.0.0',
	});
	os.release = () => '10.0.10240';
	const result = await importMain();
	t.is(result.stdout.level, 1);
});

test('return level 2 if on Windows 10 build 10586 or later', async t => {
	Object.defineProperty(process, 'platform', {
		value: 'win32',
	});
	Object.defineProperty(process.versions, 'node', {
		value: '8.0.0',
	});
	os.release = () => '10.0.10586';
	const result = await importMain();
	t.is(result.stdout.level, 2);
});

test('return level 3 if on Windows 10 build 14931 or later', async t => {
	Object.defineProperty(process, 'platform', {
		value: 'win32',
	});
	Object.defineProperty(process.versions, 'node', {
		value: '8.0.0',
	});
	os.release = () => '10.0.14931';
	const result = await importMain();
	t.is(result.stdout.level, 3);
});

test('return level 2 when FORCE_COLOR is set when not TTY in xterm256', async t => {
	process.stdout.isTTY = false;
	process.env.FORCE_COLOR = 'true';
	process.env.TERM = 'xterm-256color';
	const result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 2);
});

test('supports setting a color level using FORCE_COLOR', async t => {
	let result;
	process.env.FORCE_COLOR = '1';
	result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 1);

	process.env.FORCE_COLOR = '2';
	result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 2);

	process.env.FORCE_COLOR = '3';
	result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 3);

	process.env.FORCE_COLOR = '0';
	result = await importMain();
	t.false(result.stdout);
});

test('FORCE_COLOR maxes out at a value of 3', async t => {
	process.env.FORCE_COLOR = '4';
	const result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 3);
});

test('FORCE_COLOR works when set via command line (all values are strings)', async t => {
	let result;
	process.env.FORCE_COLOR = 'true';
	result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 1);

	process.stdout.isTTY = false;
	process.env.FORCE_COLOR = 'true';
	process.env.TERM = 'xterm-256color';
	result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 2);

	process.env.FORCE_COLOR = 'false';
	result = await importMain();
	t.false(result.stdout);
});

test('return false when `TERM` is set to dumb', async t => {
	process.env.TERM = 'dumb';
	const result = await importMain();
	t.false(result.stdout);
});

test('return false when `TERM` is set to dumb when `TERM_PROGRAM` is set', async t => {
	process.env.TERM = 'dumb';
	process.env.TERM_PROGRAM = 'Apple_Terminal';
	const result = await importMain();
	t.false(result.stdout);
});

test('return false when `TERM` is set to dumb when run on Windows', async t => {
	Object.defineProperty(process, 'platform', {
		value: 'win32',
	});
	Object.defineProperty(process.versions, 'node', {
		value: '10.13.0',
	});
	os.release = () => '10.0.14931';
	process.env.TERM = 'dumb';
	const result = await importMain();
	t.false(result.stdout);
});

test('return level 1 when `TERM` is set to dumb when `FORCE_COLOR` is set', async t => {
	process.env.FORCE_COLOR = '1';
	process.env.TERM = 'dumb';
	const result = await importMain();
	t.truthy(result.stdout);
	t.is(result.stdout.level, 1);
});

test('ignore flags when sniffFlags=false', async t => {
	process.argv = ['--color=256'];
	process.env.TERM = 'dumb';
	const {default: result, createSupportsColor} = await importFresh('./index.js');

	t.truthy(result.stdout);
	t.is(result.stdout.level, 2);

	const sniffResult = createSupportsColor(process.stdout, {sniffFlags: true});
	t.truthy(sniffResult);
	t.is(sniffResult.level, 2);

	const nosniffResult = createSupportsColor(process.stdout, {sniffFlags: false});
	t.falsy(nosniffResult);
});
