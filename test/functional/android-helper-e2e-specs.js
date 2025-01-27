import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { retryInterval } from 'asyncbox';
import helpers from '../../lib/android-helpers';
import ADB from 'appium-adb';
import { app } from './capabilities';
import { MOCHA_TIMEOUT } from './helpers';
import { exec } from 'teen_process';
import path from 'path';


let opts = {
  app,
  appPackage: 'io.appium.android.apis',
  androidInstallTimeout: 90000
};

chai.should();
chai.use(chaiAsPromised);

describe('android-helpers e2e', function () {
  let adb;
  before(async function () {
    adb = await ADB.createADB();
  });
  describe('installApk', function () {
    it('installs an apk by pushing it to the device then installing it from within', async function () {
      this.timeout(MOCHA_TIMEOUT);

      await retryInterval(10, 500, async function () {
        if (await adb.isAppInstalled(opts.appPackage)) {
          // this sometimes times out on Travis, so retry
          await adb.uninstallApk(opts.appPackage);
        }
      });
      await adb.isAppInstalled(opts.appPackage).should.eventually.be.false;
      await helpers.installApk(adb, opts);
      await adb.isAppInstalled(opts.appPackage).should.eventually.be.true;
    });
  });
  describe('ensureDeviceLocale @skip-ci', function () {
    after(async function () {
      await helpers.ensureDeviceLocale(adb, 'en', 'US');
    });
    it('should set device language and country', async function () {
      await helpers.ensureDeviceLocale(adb, 'fr', 'FR');

      if (await adb.getApiLevel() < 23) {
        await adb.getDeviceLanguage().should.eventually.equal('fr');
        await adb.getDeviceCountry().should.eventually.equal('FR');
      } else {
        await adb.getDeviceLocale().should.eventually.equal('fr-FR');
      }
    });
    it('should set device language and country with script', async function () {
      await helpers.ensureDeviceLocale(adb, 'zh', 'CN', 'Hans');

      if (await adb.getApiLevel() < 23) {
        await adb.getDeviceLanguage().should.eventually.equal('fr');
        await adb.getDeviceCountry().should.eventually.equal('FR');
      } else {
        await adb.getDeviceLocale().should.eventually.equal('fr-Hans-CN');
      }
    });
  });
  describe('pushSettingsApp', function () {
    const settingsPkg = 'io.appium.settings';
    it('should be able to upgrade from settings v1 to latest', async function () {
      await adb.uninstallApk(settingsPkg);

      // get and install old version of settings app
      await exec('npm', ['install', `${settingsPkg}@2.0.0`]);
      // old version has a different apk path, so manually enter
      // otherwise pushing the app will fail because import will have the old
      // path cached
      const settingsApkPath = path.resolve(__dirname, '..', '..', '..',
        'node_modules', 'io.appium.settings', 'bin', 'settings_apk-debug.apk');

      await adb.install(settingsApkPath);

      // get latest version of settings app
      await exec('npm', ['uninstall', settingsPkg]);
      await exec('npm', ['install', settingsPkg]);

      await helpers.pushSettingsApp(adb, true);
    });
  });
});
