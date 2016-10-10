_check_docker_sock_perms () {
  local DOCKER_SOCKET=/var/run/docker.sock

  case "$( uname )" in
    Linux)
      if [[ ! -w "${DOCKER_SOCKET}" ]]; then
          sudo setfacl -m u:$( whoami ):rw "${DOCKER_SOCKET}"
      fi
    ;;
    Darwin)
      if [[ ! -w "${DOCKER_SOCKET}" ]]; then
          sudo chmod a+w "${DOCKER_SOCKET}"
      fi
    ;;
    *)
    ;;
  esac
}

_check_docker_image_installed () {
  local DOCKER_IMAGE="${1}";
  local DOCKER_REPO="$( echo ${DOCKER_IMAGE} | cut -d : -f 1 )";
  local DOCKER_TAG="$( echo ${DOCKER_IMAGE} | cut -d : -f 2 )";

  if [[ -n "${DOCKER_TAG}" ]]; then
      if [[ "$( docker images | grep -i "${DOCKER_TAG}" | grep -i "${DOCKER_REPO}" &>/dev/null; echo $? )" != "0" ]]; then
          printf "Pulling "${DOCKER_IMAGE}" for use...\n";
          docker pull "${DOCKER_IMAGE}" &> /dev/null;
      fi;
  else
      if [[ "$( docker images | grep -i "${DOCKER_REPO}" &>/dev/null; echo $? )" != "0" ]]; then
          printf "Pulling "${DOCKER_IMAGE}" for use...\n";
          docker pull "${DOCKER_IMAGE}" &> /dev/null;
      fi;
  fi
}
