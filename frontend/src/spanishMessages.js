const spanishMessages = {
  ra: {
    action: {
      delete: 'Borrar',
      show: 'Mostrar',
      list: 'Listar',
      save: 'Guardar',
      create: 'Crear',
      edit: 'Editar',
      sort: 'Ordenar',
      cancel: 'Cancelar',
      undo: 'Deshacer',
      refresh: 'Actualizar',
      add: 'Agregar',
      remove: 'Eliminar',
      add_filter: 'Agregar filtro',
      clear_filter: 'Limpiar filtro',
      clear_filters: 'Limpiar filtros',
      remove_filter: 'Quitar este filtro',
      remove_all_filters: 'Quitar todos los filtros',
      back: 'Volver',
      bulk_actions: '%{smart_count} seleccionado |||| %{smart_count} seleccionados',
      export: 'Exportar',
      confirm: 'Confirmar',
      select_all: 'Seleccionar todo',
      select_all_button: 'Seleccionar todos',
      select_row: 'Seleccionar esta fila',
      unselect: 'Deseleccionar',
      clear_input_value: 'Limpiar valor',
      clear_array_input: 'Limpiar lista',
      clone: 'Clonar',
      create_item: 'Crear %{item}',
      expand: 'Expandir',
      close: 'Cerrar',
      open: 'Abrir',
      open_menu: 'Abrir menú',
      close_menu: 'Cerrar menú',
      update: 'Actualizar',
      update_application: 'Actualizar aplicación',
      move_up: 'Subir',
      move_down: 'Bajar',
      toggle_theme: 'Cambiar tema',
      select_columns: 'Columnas',
      search: 'Buscar',
    },
    boolean: {
      true: 'Sí',
      false: 'No',
      null: '',
    },
    page: {
      list: 'Lista de %{name}',
      edit: '%{name} #%{id}',
      show: '%{name} #%{id}',
      create: 'Crear %{name}',
      dashboard: 'Tablero',
      not_found: 'No encontrado',
      loading: 'Cargando',
      error: 'Algo salió mal',
      empty: 'Sin %{name} aún.',
      invite: '¿Quiere agregar alguno?',
      access_denied: 'Acceso denegado',
      authentication_error: 'Error de autenticación',
    },
    input: {
      file: {
        upload_several:
          'Arrastrá algunos archivos para subirlos, o presioná aquí para seleccionarlos.',
        upload_single:
          'Arrastrá un archivo para subirlo, o presioná aquí para seleccionarlo.',
      },
      image: {
        upload_several:
          'Arrastrá algunas imágenes para subirlas, o presioná aquí para seleccionarlas.',
        upload_single:
          'Arrastrá una imagen para subirla, o presioná aquí para seleccionarla.',
      },
      references: {
        all_missing: 'No se encontró ninguna referencia.',
        many_missing:
          'Al menos una de las referencias asociadas parece no estar disponible.',
        single_missing:
          'La referencia asociada parece no estar disponible.',
      },
      password: {
        toggle_visible: 'Mostrar contraseña',
        toggle_hidden: 'Ocultar contraseña',
      },
    },
    message: {
      yes: 'Sí',
      no: 'No',
      are_you_sure: '¿Estás seguro?',
      about: 'Acerca de',
      not_found: 'Ingresaste una URL incorrecta o seguiste un enlace inválido.',
      loading: 'La página está cargando, esperá un momento por favor.',
      invalid_form: 'El formulario no es válido. Por favor revisá los errores.',
      delete_title: 'Borrar %{name} #%{id}',
      delete_content: '¿Estás seguro que querés borrar este elemento?',
      bulk_delete_title:
        'Borrar %{name} |||| Borrar %{smart_count} elementos de %{name}',
      bulk_delete_content:
        '¿Estás seguro de que querés borrar este %{name}? |||| ¿Estás seguro de que querés borrar estos %{smart_count} elementos?',
      bulk_update_title:
        'Actualizar %{name} |||| Actualizar %{smart_count} elementos de %{name}',
      bulk_update_content:
        '¿Estás seguro de que querés actualizar este %{name}? |||| ¿Estás seguro de que querés actualizar estos %{smart_count} elementos?',
      error: 'Ocurrió un error en el cliente y no se pudo completar la solicitud.',
      unsaved_changes:
        'Algunos cambios no fueron guardados. ¿Estás seguro que querés ignorarlos?',
      auth_error: 'Ocurrió un error al validar el token de autenticación.',
      clear_array_input: '¿Estás seguro que querés limpiar toda la lista?',
      access_denied: 'No tenés permisos para acceder a este recurso.',
    },
    navigation: {
      clear_filters: 'Limpiar filtros',
      no_results: 'No se encontraron resultados',
      no_filtered_results:
        'No se encontraron resultados con los filtros aplicados. Intentá quitar algún filtro.',
      no_more_results:
        'La página %{page} está fuera de los límites. Probá con la página anterior.',
      page_out_of_boundaries: 'La página %{page} está fuera de los límites',
      page_out_from_end: 'No se puede navegar después de la última página',
      page_out_from_begin: 'No se puede navegar antes de la página 1',
      page_range_info: '%{offsetBegin}-%{offsetEnd} de %{total}',
      partial_page_range_info:
        '%{offsetBegin}-%{offsetEnd} de más de %{offsetEnd}',
      current_page: 'Página %{page}',
      page: 'Ir a la página %{page}',
      first: 'Ir a la primera página',
      last: 'Ir a la última página',
      next: 'Siguiente',
      previous: 'Anterior',
      prev: 'Anterior',
      page_rows_per_page: 'Filas por página',
      skip_nav: 'Saltar al contenido',
    },
    sort: {
      sort_by: 'Ordenado por %{field} %{order}',
      ASC: 'ascendente',
      DESC: 'descendente',
    },
    auth: {
      username: 'Usuario',
      password: 'Contraseña',
      sign_in: 'Ingresar',
      sign_in_error: 'Error de autenticación, por favor reintentá',
      logout: 'Cerrar sesión',
      user_menu: 'Perfil',
      auth_check_error: 'Falló la conexión',
    },
    notification: {
      updated:
        'Elemento actualizado |||| %{smart_count} elementos actualizados',
      created: 'Elemento creado',
      deleted: 'Elemento borrado |||| %{smart_count} elementos borrados',
      bad_item: 'Elemento incorrecto',
      item_doesnt_exist: 'El elemento no existe',
      http_error: 'Error de comunicación con el servidor',
      data_provider_error:
        'Error en el proveedor de datos. Revisá la consola para más detalles.',
      canceled: 'Acción cancelada',
      logged_out: 'Tu sesión finalizó, por favor volvé a conectarte.',
      not_authorized: 'No tenés autorización para acceder a este recurso.',
      application_update_available: 'Hay una nueva versión disponible.',
      caja_cerrada: 'La caja ya está cerrada.',
      caja_abierta: 'La caja ya está abierta.',
      caja_no_abierta: 'La caja no está abierta.',
      caja_no_cerrada: 'La caja no está cerrada.',
      'Cierre de caja realizado': 'Cierre de caja realizado',
      'Turno cerrado correctamente': 'Turno cerrado correctamente',
      'Turno creado y reserva finalizada': 'Turno creado y reserva finalizada',

    },
    validation: {
      required: 'Requerido',
      minLength: 'Debe tener al menos %{min} caracteres',
      maxLength: 'Debe tener %{max} caracteres o menos',
      minValue: 'Debe ser al menos %{min}',
      maxValue: 'Debe ser %{max} o menos',
      number: 'Debe ser un número',
      email: 'Debe ser un correo electrónico válido',
      oneOf: 'Debe ser uno de los siguientes valores: %{options}',
      regex: 'Debe seguir un formato específico (regexp): %{pattern}',
    },
    saved_queries: {
      label: 'Búsquedas guardadas',
      query_name: 'Nombre de búsqueda',
      new_label: 'Guardar búsqueda actual...',
      new_dialog_title: 'Guardar búsqueda actual como',
      remove_label: 'Quitar búsqueda guardada',
      remove_label_with_name: 'Quitar búsqueda "%{name}"',
      remove_dialog_title: '¿Quitar búsqueda guardada?',
      remove_message:
        '¿Estás seguro de que querés eliminar ese elemento de tu lista de búsquedas guardadas?',
      help: 'Filtrá la lista y guardá esta búsqueda para más tarde',
    },
    configurable: {
      customize: 'Personalizar',
      configureMode: 'Configurar esta página',
      inspector: {
        title: 'Inspector',
        content: 'Pasá el cursor por los elementos de la UI para configurarlos',
        reset: 'Restablecer configuración',
        hide: 'Ocultar inspector',
      },
      Datagrid: {
        title: 'Tabla de datos',
        unlabeled: 'Columna sin etiqueta #%{column}',
      },
      SimpleForm: {
        title: 'Formulario',
        unlabeled: 'Campo sin etiqueta #%{input}',
      },
      SimpleList: {
        title: 'Lista simple',
        primaryText: 'Texto primario',
        secondaryText: 'Texto secundario',
        tertiaryText: 'Texto terciario',
      },
    },
  },
  resources: {
    turnos: {
      fields: {
        mostrar_cerrados: 'Ver Cerrados',
        PagoPendiente: 'Pagado',
      },
      actions: {
        cerrar: 'Cerrar',
        pago: 'Pago',
        limpiar: 'Limpiar',
      },
      empty: 'No hay turnos activos o pendientes para este motel.',
    },
  },
};

export default spanishMessages;
