[all:vars]
ansible_user=ubuntu
ansible_ssh_private_key_file=${ssh_key_path}
ansible_ssh_common_args='-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
ansible_python_interpreter=/usr/bin/python3

[jenkins]
${jenkins_ip}

[k8s_master]
${k8s_master_ip}

[k8s_workers]
%{ for ip in k8s_worker_ips ~}
${ip}
%{ endfor ~}

[k8s:children]
k8s_master
k8s_workers
