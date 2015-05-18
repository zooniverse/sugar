# -*- mode: ruby -*-
# vi: set ft=ruby :
VAGRANTFILE_API_VERSION = '2'

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = 'ubuntu-14.04-docker'
  config.vm.box_url = 'https://cloud-images.ubuntu.com/vagrant/trusty/current/trusty-server-cloudimg-amd64-vagrant-disk1.box'
  config.vm.network :forwarded_port, guest: 2999, host: 2999    # node
  config.vm.network :forwarded_port, guest: 6378, host: 6378    # redis
  
  config.vm.provision 'docker' do |d|
    d.pull_images 'redis'
    
    d.run 'redis',
          args: '--name redis --publish 6378:6378'
    
    d.build_image '/vagrant', args: '-t zooniverse/sugar'
    d.run 'sugar', image: 'zooniverse/sugar',
          args: '--publish 2999:2999 --link redis:sugar_redis -v /vagrant:/node_app --env SUGAR_TALK_USERNAME=talk --env SUGAR_TALK_PASSWORD=SomePW --env PANOPTES_HOST=https://dev.zooniverse.org'
  end
  
  config.vm.provider :virtualbox do |vb|
    vb.customize ['modifyvm', :id, '--memory', '2048']
    vb.customize ['modifyvm', :id, '--cpus', '4']
  end
end
