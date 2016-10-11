observatory () {
  local DOCKER_IMAGE="mozilla/observatory-cli"
  local OBSERVATORY_NETWORK="$( docker network ls | grep observatory | awk '{print $2}' )"
  local OBSERVATORY_API="$( docker ps | grep website | awk '{print $NF}' )"
  local COMMAND="docker run --rm -it --name observatory-cli --net=$OBSERVATORY_NETWORK -e HTTPOBS_API_URL=http://$OBSERVATORY_API:57001/api/v1/ --link $OBSERVATORY_API"
  local NOBACKEND_COMMAND="docker run --rm -it --name observatory-cli"
  local ARGS="${@}"

  ## Allow entering the container to test by hand
  case "${1}" in
    debug)
      COMMAND="${COMMAND} --entrypoint=/bin/ash --user=root"
      unset ARGS
    ;;
  esac

  _check_docker_sock_perms
  _check_docker_image_installed "${DOCKER_IMAGE}"

  ## Check to see if we're running HTTP Observatory in containers.  If not, use default public instance.
  if [[ -z "$( docker ps | grep website | awk '{print $NF}' )" ]]; then
    COMMAND="${NOBACKEND_COMMAND}"
  fi

  ${COMMAND} ${DOCKER_IMAGE} ${ARGS}
}
